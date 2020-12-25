// Generated automatically by nearley, version 2.20.1
// http://github.com/Hardmath123/nearley
// Bypasses TS6133. Allow declared but unused functions.
// @ts-ignore
function id(d: any[]): any { return d[0]; }

    function parenthesis(d:any[]) {
        return { type: "Parenthesis", value: d[2] }
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
    function like(d:any[]) {
        return { type: "Comparison", name: "like", ...d[0], value: d[4] }
    }
    function between(d:any[]) {
        return { type: "Comparison", name: "between", ...d[0], value: [d[4],d[8]] }
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
    {"name": "unary$subexpression$1", "symbols": [/[nN]/, /[oO]/, /[tT]/], "postprocess": function(d) {return d.join(""); }},
    {"name": "unary", "symbols": ["unary$subexpression$1", "__", "parenthesis"], "postprocess": unary("not")},
    {"name": "unary$subexpression$2", "symbols": [/[nN]/, /[oO]/, /[tT]/], "postprocess": function(d) {return d.join(""); }},
    {"name": "unary", "symbols": ["unary$subexpression$2", "__", "prop"], "postprocess": unary("not")},
    {"name": "unary", "symbols": ["parenthesis"], "postprocess": id},
    {"name": "binary$subexpression$1", "symbols": [/[oO]/, /[rR]/], "postprocess": function(d) {return d.join(""); }},
    {"name": "binary", "symbols": ["binary", "__", "binary$subexpression$1", "__", "unary"], "postprocess": binary("or")},
    {"name": "binary$subexpression$2", "symbols": [/[aA]/, /[nN]/, /[dD]/], "postprocess": function(d) {return d.join(""); }},
    {"name": "binary", "symbols": ["binary", "__", "binary$subexpression$2", "__", "unary"], "postprocess": binary("and")},
    {"name": "binary", "symbols": ["unary"], "postprocess": id},
    {"name": "comparison", "symbols": ["atom", "_", {"literal":">"}, "_", "atom"], "postprocess": compare("gt")},
    {"name": "comparison", "symbols": ["atom", "_", {"literal":"<"}, "_", "atom"], "postprocess": compare("lt")},
    {"name": "comparison$string$1", "symbols": [{"literal":">"}, {"literal":"="}], "postprocess": (d) => d.join('')},
    {"name": "comparison", "symbols": ["atom", "_", "comparison$string$1", "_", "atom"], "postprocess": compare("gte")},
    {"name": "comparison$string$2", "symbols": [{"literal":"<"}, {"literal":"="}], "postprocess": (d) => d.join('')},
    {"name": "comparison", "symbols": ["atom", "_", "comparison$string$2", "_", "atom"], "postprocess": compare("lte")},
    {"name": "comparison$string$3", "symbols": [{"literal":"<"}, {"literal":">"}], "postprocess": (d) => d.join('')},
    {"name": "comparison", "symbols": ["atom", "_", "comparison$string$3", "_", "atom"], "postprocess": compare("ne")},
    {"name": "comparison", "symbols": ["atom", "_", {"literal":"="}, "_", "atom"], "postprocess": compare("eq")},
    {"name": "comparison$string$4", "symbols": [{"literal":"l"}, {"literal":"i"}, {"literal":"k"}, {"literal":"e"}], "postprocess": (d) => d.join('')},
    {"name": "comparison", "symbols": ["prop", "__", "comparison$string$4", "__", "string"], "postprocess": like},
    {"name": "comparison$string$5", "symbols": [{"literal":"b"}, {"literal":"e"}, {"literal":"t"}, {"literal":"w"}, {"literal":"e"}, {"literal":"e"}, {"literal":"n"}], "postprocess": (d) => d.join('')},
    {"name": "comparison$string$6", "symbols": [{"literal":"a"}, {"literal":"n"}, {"literal":"d"}], "postprocess": (d) => d.join('')},
    {"name": "comparison", "symbols": ["prop", "__", "comparison$string$5", "__", "strnum", "__", "comparison$string$6", "__", "strnum"], "postprocess": between},
    {"name": "atom", "symbols": ["value"], "postprocess": id},
    {"name": "atom", "symbols": ["prop"], "postprocess": id},
    {"name": "prop$ebnf$1", "symbols": [/[a-zA-Z_]/]},
    {"name": "prop$ebnf$1", "symbols": ["prop$ebnf$1", /[a-zA-Z_]/], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "prop$ebnf$2", "symbols": []},
    {"name": "prop$ebnf$2", "symbols": ["prop$ebnf$2", /[0-9]/], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "prop", "symbols": ["prop$ebnf$1", "prop$ebnf$2"], "postprocess": d => ({ prop: join(d) })},
    {"name": "value", "symbols": ["primitive"], "postprocess": d => ({ value: d[0] })},
    {"name": "primitive", "symbols": ["string"], "postprocess": id},
    {"name": "primitive", "symbols": ["number"], "postprocess": id},
    {"name": "primitive", "symbols": ["boolean"], "postprocess": id},
    {"name": "strnum", "symbols": ["string"], "postprocess": id},
    {"name": "strnum", "symbols": ["number"], "postprocess": id},
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
