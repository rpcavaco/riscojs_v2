
import re
import codecs
import argparse

from os import scandir, remove
from os.path import splitext, exists, join as path_join
from copy import deepcopy
from comment_parser.comment_parser import extract_comments_from_str

# * @param {string} p_paneldiv_id 	- Id of HTML DIV element to act as RiscoJS map panel


DOCS_SOURCE_OUTPUT = "docs\source\generated"
CODE_SOURCE = "src"



META_TYPES = ["@param", "@throws", "@returns"]

PATT_1 = "[\s]+\{([^\}]+)\}[\s]+([\S]+)\s(.*)$"
PATT_2 = "[\s]+\{([^\}]+)\}[\s]+([\S]+)"
PATT_3 = "[\s]+[\{]?([^\}]+)[\}]?$"

OPTSTR = ("optional", "opcional")

class ParseException(Exception):
	pass

class OptArgsException(Exception):
	pass

class CodeObj:
	def __init__(self, p_type, p_name) -> None:
		self.type = p_type
		self.name = p_name
		self.desclines = []
		self.params = []
		self.rettype = None
		self.throwtype = None

	def addDescline(self, p_lnstr) -> None:
		self.desclines.append(p_lnstr)

	def addParam(self, p_type, p_name, comment=None) -> None:
		self.params.append((p_name, p_type, comment))

	def setRetype(self, p_type, comment=None) -> None:
		self.rettype = (p_type, comment)		

	def setThrowtype(self, p_type, comment=None) -> None:
		self.throwtype = (p_type, comment)		

def do_parse(p_fpath, o_retlist, elemfilter=None, dodebug=False):

	del o_retlist[:]
	parsed = extract_comments_from_str(open(p_fpath).read(), 'application/javascript')
	for ei, elem in enumerate(parsed):

		if not elemfilter is None:
			if not ei in elemfilter:
				continue

		currentobj = None
		
		for rawln in elem.text().splitlines():
			ln = rawln.replace('*', '').lstrip()

			if dodebug:
				print(">>", f">{ln}<")

			if len(ln) > 0:
				if currentobj is None:
					splits = ln.split()
					currentobj = CodeObj(splits[0].lower(), splits[1])
				else:
					if not ln.startswith("@"):
						currentobj.addDescline(ln.strip())
					else:

						for metatype in META_TYPES:

							mo = re.search(metatype + PATT_1, ln)
							if mo is None:
								mo = re.search(metatype + PATT_2, ln)
							if not mo is None:
								grps = mo.groups()
								assert len(grps) >= 2, grps

								if dodebug:
									print("do_parse A", metatype,grps )

								if metatype.startswith("@param"):
									currentobj.addParam(*[re.sub('[\s]+', ' ', x).strip("- \t") for x in grps[:3]])
								elif metatype.startswith("@ret"):
									currentobj.setRetype(*[re.sub('[\s]+', ' ', x).strip("- \t") for x in grps[:2]])
								elif metatype.startswith("@thro"):
									currentobj.setThrowtype(*[re.sub('[\s]+', ' ', x).strip("- \t") for x in grps[:2]])
							else:
								mo = re.search(metatype + PATT_3, ln)
								if not mo is None:							
									grps = mo.groups()
									assert len(grps) >= 1, grps

									if dodebug:
										print("do_parse B", metatype,grps )

									if metatype.startswith("@param"):
										raise ParseException(f"Not enough items in @param def: {grps}. Minimum is 2")

									try:
										if metatype.startswith("@ret"):
											currentobj.setRetype(*[re.sub('[\s]+', ' ', x).strip("- \t") for x in grps[:2]])
										elif metatype.startswith("@thro"):
											currentobj.setThrowtype(*[re.sub('[\s]+', ' ', x).strip("- \t") for x in grps[:2]])
									except TypeError as e:
										raise ParseException(f"groups: {grps} ex:{e}")

							if mo is None:
								pass

		if not currentobj is None:
			o_retlist.append(deepcopy(currentobj))

def gendoc_fromparsed_comments(p_coderootpath, p_docsout_rootpath, debug=False):

	parsed_objs = []
	for entry in scandir(p_coderootpath):
		if entry.is_file():
			basenm, sext = splitext(entry.name)
			if basenm.startswith("_") or sext.lower() != ".js":
				continue
			do_parse(entry.path, parsed_objs, dodebug=debug)
			if len(parsed_objs) > 0:

				docsrc_name = f"{basenm}.rst"
				docsrc_path = path_join(p_docsout_rootpath, docsrc_name)
				if exists(docsrc_path):
					# delete existing doc source9
					# print(f"deleting {docsrc_path}")
					remove(docsrc_path)

				with codecs.open(docsrc_path, 'w', 'utf-8') as fl:

					for po in parsed_objs:

						requireds = []
						optionals = []
						for pi, parm in enumerate(po.params):
							optional = False
							if not parm[2] is None:
								for opstr in OPTSTR:
									if opstr in parm[2].lower():
										optional = True
										break

							if optional:
								optionals.append(parm[0])
							else:
								if len(optionals) > 0:
									raise OptArgsException(f"{po.name} - required arg '{parm[0]}' defined after existing optional args: {optionals}")
								requireds.append(parm[0])

						argsstr = ", ".join(requireds)
						if len(optionals) > 0:
							if len(requireds) > 0:
								argsstr = argsstr + f"[, {', '.join(optionals)}]"
							else:
								argsstr = f"[{', '.join(optionals)}]"

						fl.write(f".. js:{po.type}:: {po.name}({argsstr})\n\n")

						for dln in po.desclines:
							fl.write(f"\t{dln}\n\n")

						for parm in po.params:
							name, stype, comment = parm
							fl.write(f"\t:param {stype} {name}: {comment}\n")

						if not po.rettype is None:
							stype, comment = po.rettype
							if not comment is None:
								fl.write(f"\t:returns: {stype} {comment}\n")
							else:
								fl.write(f"\t:returns: {stype}\n")

						if not po.throwtype is None:
							stype, comment = po.throwtype
							if not comment is None:
								fl.write(f"\t:throws {stype}: {comment}\n")
							else:
								fl.write(f"\t:throws {stype}:\n")

						fl.write("\n")






def main(p_coderootpath, p_docsout_rootpath, p_argsparsed):
	gendoc_fromparsed_comments(p_coderootpath, p_docsout_rootpath, debug=p_argsparsed.debug)


if __name__ == "__main__":
	parser = argparse.ArgumentParser(description='Parsing docstrings JSDoc')
	parser.add_argument("-d", "--debug", help="debug flag", action="store_true")
	args = parser.parse_args()	
	main(CODE_SOURCE, DOCS_SOURCE_OUTPUT, args)