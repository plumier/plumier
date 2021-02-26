// Generated automatically by nearley, version 2.20.1
// http://github.com/Hardmath123/nearley
// Bypasses TS6133. Allow declared but unused functions.
// @ts-ignore
function id(d: any[]): any { return d[0]; }

    function parenthesis(d:any[]) {
        return { type: "Parenthesis", expr: d[2] }
    }


    function binary(name:string) {
        return (d:any[]) => ({ type: "Binary", name, left: d[0], right: d[4] })
    }
    function unary(name:string) {
        return (d:any[]) => ({ type: "Unary", name, expr: d[2] })
    }


    function compare(name:string) {
        return (d:any[]) => ({ type: "Comparison", name, ...d[0], ...d[4] })
    }

 
    function join(d:any[]) { 
        return d.map(x => Array.isArray(x) ? x.join("") : (x + "")).join("")
    }

interface NearleyToken {
  value: any;
  [key: string]: any;
};

interface NearleyLexer {
  reset: (chunk: string, info: any) => void;
  next: () => NearleyToken | undefined;
  save: () => any;
  formatError: (token: never) => string;
  has: (tokenType: string) => boolean;
};

interface NearleyRule {
  name: string;
  symbols: NearleySymbol[];
  postprocess?: (d: any[], loc?: number, reject?: {}) => any;
};

type NearleySymbol = string | { literal: any } | { test: (token: any) => boolean };

interface Grammar {
  Lexer: NearleyLexer | undefined;
  ParserRules: NearleyRule[];
  ParserStart: string;
};

const grammar: Grammar = {
  Lexer: undefined,
  ParserRules: [
    {"name": "_$ebnf$1", "symbols": []},
    {"name": "_$ebnf$1", "symbols": ["_$ebnf$1", "wschar"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "_", "symbols": ["_$ebnf$1"], "postprocess": function(d) {return null;}},
    {"name": "__$ebnf$1", "symbols": ["wschar"]},
    {"name": "__$ebnf$1", "symbols": ["__$ebnf$1", "wschar"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "__", "symbols": ["__$ebnf$1"], "postprocess": function(d) {return null;}},
    {"name": "wschar", "symbols": [/[ \t\n\v\f]/], "postprocess": id},
    {"name": "main", "symbols": ["_", "binary", "_"], "postprocess": d => d[1]},
    {"name": "parenthesis", "symbols": [{"literal":"("}, "_", "parenthesis", "_", {"literal":")"}], "postprocess": parenthesis},
    {"name": "parenthesis", "symbols": [{"literal":"("}, "_", "binary", "_", {"literal":")"}], "postprocess": parenthesis},
    {"name": "parenthesis", "symbols": ["comparison"], "postprocess": id},
    {"name": "unary$subexpression$1", "symbols": [{"literal":"!"}], "postprocess": function(d) {return d.join(""); }},
    {"name": "unary", "symbols": ["unary$subexpression$1", "_", "parenthesis"], "postprocess": unary("not")},
    {"name": "unary$subexpression$2", "symbols": [{"literal":"!"}], "postprocess": function(d) {return d.join(""); }},
    {"name": "unary", "symbols": ["unary$subexpression$2", "_", "prop"], "postprocess": unary("not")},
    {"name": "unary", "symbols": ["parenthesis"], "postprocess": id},
    {"name": "binary$subexpression$1", "symbols": [/[oO]/, /[rR]/], "postprocess": function(d) {return d.join(""); }},
    {"name": "binary", "symbols": ["binary", "_", "binary$subexpression$1", "_", "unary"], "postprocess": binary("or")},
    {"name": "binary$subexpression$2", "symbols": [/[aA]/, /[nN]/, /[dD]/], "postprocess": function(d) {return d.join(""); }},
    {"name": "binary", "symbols": ["binary", "_", "binary$subexpression$2", "_", "unary"], "postprocess": binary("and")},
    {"name": "binary", "symbols": ["unary"], "postprocess": id},
    {"name": "comparison", "symbols": ["atom", "_", {"literal":">"}, "_", "atom"], "postprocess": compare("gt")},
    {"name": "comparison", "symbols": ["atom", "_", {"literal":"<"}, "_", "atom"], "postprocess": compare("lt")},
    {"name": "comparison$string$1", "symbols": [{"literal":">"}, {"literal":"="}], "postprocess": (d) => d.join('')},
    {"name": "comparison", "symbols": ["atom", "_", "comparison$string$1", "_", "atom"], "postprocess": compare("gte")},
    {"name": "comparison$string$2", "symbols": [{"literal":"<"}, {"literal":"="}], "postprocess": (d) => d.join('')},
    {"name": "comparison", "symbols": ["atom", "_", "comparison$string$2", "_", "atom"], "postprocess": compare("lte")},
    {"name": "comparison$string$3", "symbols": [{"literal":"!"}, {"literal":"="}], "postprocess": (d) => d.join('')},
    {"name": "comparison", "symbols": ["atom", "_", "comparison$string$3", "_", "atom"], "postprocess": compare("ne")},
    {"name": "comparison", "symbols": ["prop", "_", {"literal":"="}, "_", "range"], "postprocess": compare("range")},
    {"name": "comparison", "symbols": ["prop", "_", {"literal":"="}, "_", "contains"], "postprocess": compare("contains")},
    {"name": "comparison", "symbols": ["prop", "_", {"literal":"="}, "_", "starts_with"], "postprocess": compare("startsWith")},
    {"name": "comparison", "symbols": ["prop", "_", {"literal":"="}, "_", "ends_with"], "postprocess": compare("endsWith")},
    {"name": "comparison", "symbols": ["atom", "_", {"literal":"="}, "_", "atom"], "postprocess": compare("eq")},
    {"name": "atom", "symbols": ["value"], "postprocess": id},
    {"name": "atom", "symbols": ["prop"], "postprocess": id},
    {"name": "atom", "symbols": ["str_start_with"], "postprocess": id},
    {"name": "prop$ebnf$1", "symbols": [/[a-zA-Z_]/]},
    {"name": "prop$ebnf$1", "symbols": ["prop$ebnf$1", /[a-zA-Z_]/], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "prop$ebnf$2", "symbols": []},
    {"name": "prop$ebnf$2", "symbols": ["prop$ebnf$2", /[0-9]/], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "prop", "symbols": ["prop$ebnf$1", "prop$ebnf$2"], "postprocess": d => ({ prop: join(d) })},
    {"name": "value", "symbols": ["primitive"], "postprocess": d => ({ value: d[0] })},
    {"name": "range", "symbols": [{"literal":"("}, "_", "range", "_", {"literal":")"}], "postprocess": d => d[2]},
    {"name": "range$subexpression$1", "symbols": [/[tT]/, /[oO]/], "postprocess": function(d) {return d.join(""); }},
    {"name": "range", "symbols": ["string", "_", "range$subexpression$1", "_", "string"], "postprocess": d => ({ value: [d[0],d[4]] })},
    {"name": "range$subexpression$2", "symbols": [/[tT]/, /[oO]/], "postprocess": function(d) {return d.join(""); }},
    {"name": "range", "symbols": ["number", "_", "range$subexpression$2", "_", "number"], "postprocess": d => ({ value: [d[0],d[4]] })},
    {"name": "contains$ebnf$1", "symbols": [/./]},
    {"name": "contains$ebnf$1", "symbols": ["contains$ebnf$1", /./], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "contains", "symbols": ["quote", {"literal":"*"}, "contains$ebnf$1", {"literal":"*"}, "quote"], "postprocess": d => ({ value: join(d[2]) })},
    {"name": "starts_with$ebnf$1", "symbols": [/./]},
    {"name": "starts_with$ebnf$1", "symbols": ["starts_with$ebnf$1", /./], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "starts_with", "symbols": ["quote", /[^\*]/, "starts_with$ebnf$1", {"literal":"*"}, "quote"], "postprocess": d => ({ value: join([d[1], ...d[2]]) })},
    {"name": "ends_with$ebnf$1", "symbols": [/./]},
    {"name": "ends_with$ebnf$1", "symbols": ["ends_with$ebnf$1", /./], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "ends_with", "symbols": ["quote", {"literal":"*"}, "ends_with$ebnf$1", /[^\*]/, "quote"], "postprocess": d => ({ value: join([...d[2], d[3]]) })},
    {"name": "primitive", "symbols": ["string"], "postprocess": id},
    {"name": "primitive", "symbols": ["number"], "postprocess": id},
    {"name": "primitive", "symbols": ["boolean"], "postprocess": id},
    {"name": "boolean$subexpression$1", "symbols": [/[tT]/, /[rR]/, /[uU]/, /[eE]/], "postprocess": function(d) {return d.join(""); }},
    {"name": "boolean", "symbols": ["boolean$subexpression$1"], "postprocess": d => true},
    {"name": "boolean$subexpression$2", "symbols": [/[fF]/, /[aA]/, /[lL]/, /[sS]/, /[eE]/], "postprocess": function(d) {return d.join(""); }},
    {"name": "boolean", "symbols": ["boolean$subexpression$2"], "postprocess": d => false},
    {"name": "string$ebnf$1", "symbols": []},
    {"name": "string$ebnf$1", "symbols": ["string$ebnf$1", /./], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "string", "symbols": ["quote", "string$ebnf$1", "quote"], "postprocess": d => join(d[1])},
    {"name": "string$ebnf$2", "symbols": []},
    {"name": "string$ebnf$2", "symbols": ["string$ebnf$2", /./], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "string", "symbols": ["quote", "string$ebnf$2", "quote"], "postprocess": d => join(d[1])},
    {"name": "quote", "symbols": [{"literal":"\""}], "postprocess": id},
    {"name": "quote", "symbols": [{"literal":"'"}], "postprocess": id},
    {"name": "number$ebnf$1", "symbols": [/[0-9]/]},
    {"name": "number$ebnf$1", "symbols": ["number$ebnf$1", /[0-9]/], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "number", "symbols": ["number$ebnf$1"], "postprocess": d => parseInt(join(d))},
    {"name": "number$ebnf$2", "symbols": [/[0-9]/]},
    {"name": "number$ebnf$2", "symbols": ["number$ebnf$2", /[0-9]/], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "number$ebnf$3", "symbols": [/[0-9]/]},
    {"name": "number$ebnf$3", "symbols": ["number$ebnf$3", /[0-9]/], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "number", "symbols": ["number$ebnf$2", {"literal":"."}, "number$ebnf$3"], "postprocess": d => parseFloat(join(d))}
  ],
  ParserStart: "main",
};

export default grammar;
