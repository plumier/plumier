// Generated automatically by nearley, version 2.20.1
// http://github.com/Hardmath123/nearley
// Bypasses TS6133. Allow declared but unused functions.
// @ts-ignore
function id(d: any[]): any { return d[0]; }

    function comparison(operator:string) {
        return (d:any[], col?:number) => ({ kind: "ComparisonExpression", operator, left: d[0], right: d[4], col })
    }
    function logic(operator:string) {
        return (d:any[], col?:number) => ({ kind: "LogicalExpression", operator, left: d[0], right: d[4], col })
    }
    function unary(operator:string) {
        return (d:any[], col?:number) => ({ kind: "UnaryExpression", operator, argument: d[2], col })
    }


    function join(d:any[]) { 
        return d.map(x => Array.isArray(x) ? x.join("") : (x + "")).join("")
    }

    function literal(annotation:string, value: any, col?:number, preference?:string) {
        return { kind: "Literal", annotation, value, preference: preference ?? "none", col } 
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
    {"name": "main", "symbols": ["_", "or", "_"], "postprocess": d => d[1]},
    {"name": "comparison", "symbols": ["atom", "_", {"literal":">"}, "_", "atom"], "postprocess": comparison("gt")},
    {"name": "comparison", "symbols": ["atom", "_", {"literal":"<"}, "_", "atom"], "postprocess": comparison("lt")},
    {"name": "comparison$string$1", "symbols": [{"literal":">"}, {"literal":"="}], "postprocess": (d) => d.join('')},
    {"name": "comparison", "symbols": ["atom", "_", "comparison$string$1", "_", "atom"], "postprocess": comparison("gte")},
    {"name": "comparison$string$2", "symbols": [{"literal":"<"}, {"literal":"="}], "postprocess": (d) => d.join('')},
    {"name": "comparison", "symbols": ["atom", "_", "comparison$string$2", "_", "atom"], "postprocess": comparison("lte")},
    {"name": "comparison$string$3", "symbols": [{"literal":"!"}, {"literal":"="}], "postprocess": (d) => d.join('')},
    {"name": "comparison", "symbols": ["atom", "_", "comparison$string$3", "_", "atom"], "postprocess": comparison("ne")},
    {"name": "comparison", "symbols": ["atom", "_", {"literal":"="}, "_", "atom"], "postprocess": comparison("eq")},
    {"name": "comparison", "symbols": ["prop", "_", {"literal":"="}, "_", "string_like"], "postprocess": comparison("like")},
    {"name": "comparison", "symbols": ["prop", "_", {"literal":"="}, "_", "string_range"], "postprocess": comparison("range")},
    {"name": "group", "symbols": [{"literal":"("}, "_", "group", "_", {"literal":")"}], "postprocess": d => d[2]},
    {"name": "group", "symbols": [{"literal":"("}, "_", "or", "_", {"literal":")"}], "postprocess": d => d[2]},
    {"name": "group", "symbols": ["comparison"], "postprocess": id},
    {"name": "unary", "symbols": [{"literal":"!"}, "_", "unary"], "postprocess": unary("not")},
    {"name": "unary", "symbols": [{"literal":"!"}, "_", "or"], "postprocess": unary("not")},
    {"name": "unary", "symbols": ["group"], "postprocess": id},
    {"name": "and$subexpression$1", "symbols": [/[aA]/, /[nN]/, /[dD]/], "postprocess": function(d) {return d.join(""); }},
    {"name": "and", "symbols": ["and", "__", "and$subexpression$1", "__", "unary"], "postprocess": logic("and")},
    {"name": "and", "symbols": ["unary"], "postprocess": id},
    {"name": "or$subexpression$1", "symbols": [/[oO]/, /[rR]/], "postprocess": function(d) {return d.join(""); }},
    {"name": "or", "symbols": ["or", "__", "or$subexpression$1", "__", "and"], "postprocess": logic("or")},
    {"name": "or", "symbols": ["and"], "postprocess": id},
    {"name": "atom", "symbols": ["string"], "postprocess": id},
    {"name": "atom", "symbols": ["number"], "postprocess": id},
    {"name": "atom", "symbols": ["prop"], "postprocess": id},
    {"name": "atom", "symbols": ["group"], "postprocess": id},
    {"name": "atom", "symbols": ["boolean"], "postprocess": id},
    {"name": "atom", "symbols": ["nullish"], "postprocess": id},
    {"name": "nullish$subexpression$1", "symbols": [/[nN]/, /[uU]/, /[lL]/, /[lL]/], "postprocess": function(d) {return d.join(""); }},
    {"name": "nullish", "symbols": ["nullish$subexpression$1"], "postprocess": (d, c) => literal("Null", undefined, c)},
    {"name": "boolean$subexpression$1", "symbols": [/[tT]/, /[rR]/, /[uU]/, /[eE]/], "postprocess": function(d) {return d.join(""); }},
    {"name": "boolean", "symbols": ["boolean$subexpression$1"], "postprocess": (d, c) => literal("Boolean", true, c)},
    {"name": "boolean$subexpression$2", "symbols": [/[fF]/, /[aA]/, /[lL]/, /[sS]/, /[eE]/], "postprocess": function(d) {return d.join(""); }},
    {"name": "boolean", "symbols": ["boolean$subexpression$2"], "postprocess": (d, c) => literal("Boolean", false, c)},
    {"name": "prop$ebnf$1", "symbols": [/[a-zA-Z_]/]},
    {"name": "prop$ebnf$1", "symbols": ["prop$ebnf$1", /[a-zA-Z_]/], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "prop$ebnf$2", "symbols": []},
    {"name": "prop$ebnf$2", "symbols": ["prop$ebnf$2", /[0-9]/], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "prop", "symbols": ["prop$ebnf$1", "prop$ebnf$2"], "postprocess": (d, c) => literal("Property", join(d), c)},
    {"name": "number$ebnf$1", "symbols": [/[0-9]/]},
    {"name": "number$ebnf$1", "symbols": ["number$ebnf$1", /[0-9]/], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "number", "symbols": ["number$ebnf$1"], "postprocess": (d, c) => literal("Number", parseInt(join(d)), c)},
    {"name": "number$ebnf$2", "symbols": [/[0-9]/]},
    {"name": "number$ebnf$2", "symbols": ["number$ebnf$2", /[0-9]/], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "number$ebnf$3", "symbols": [/[0-9]/]},
    {"name": "number$ebnf$3", "symbols": ["number$ebnf$3", /[0-9]/], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "number", "symbols": ["number$ebnf$2", {"literal":"."}, "number$ebnf$3"], "postprocess": (d, c) => literal("Number", parseFloat(join(d)), c)},
    {"name": "string_contains", "symbols": [{"literal":"*"}, "native_string", {"literal":"*"}], "postprocess": (d, c) => literal("String", d[1], c, "contains")},
    {"name": "string_like", "symbols": [{"literal":"*"}, "native_string"], "postprocess": (d, c) => literal("String", d[1], c, "endsWith")},
    {"name": "string_like", "symbols": ["native_string", {"literal":"*"}], "postprocess": (d, c) => literal("String", d[0], c, "startsWith")},
    {"name": "string_like", "symbols": ["string_contains"], "postprocess": id},
    {"name": "range_group", "symbols": [{"literal":"("}, "_", "string_range", "_", {"literal":")"}], "postprocess": (d, c) => d[2]},
    {"name": "string_range$subexpression$1", "symbols": [/[tT]/, /[oO]/], "postprocess": function(d) {return d.join(""); }},
    {"name": "string_range", "symbols": ["string", "__", "string_range$subexpression$1", "__", "string"], "postprocess": (d, c) => literal("String", [d[0].value, d[4].value], c, "range")},
    {"name": "string_range$subexpression$2", "symbols": [/[tT]/, /[oO]/], "postprocess": function(d) {return d.join(""); }},
    {"name": "string_range", "symbols": ["number", "__", "string_range$subexpression$2", "__", "number"], "postprocess": (d, c) => literal("Number", [d[0].value, d[4].value], c, "range")},
    {"name": "string_range", "symbols": ["range_group"]},
    {"name": "string", "symbols": ["native_string"], "postprocess": (d, c) => literal("String", d[0], c)},
    {"name": "native_string", "symbols": ["sqstring"], "postprocess": id},
    {"name": "native_string", "symbols": ["dqstring"], "postprocess": id},
    {"name": "dqstring$ebnf$1", "symbols": []},
    {"name": "dqstring$ebnf$1", "symbols": ["dqstring$ebnf$1", "dstrchar"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "dqstring", "symbols": [{"literal":"\""}, "dqstring$ebnf$1", {"literal":"\""}], "postprocess": d => d[1].join("")},
    {"name": "sqstring$ebnf$1", "symbols": []},
    {"name": "sqstring$ebnf$1", "symbols": ["sqstring$ebnf$1", "sstrchar"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "sqstring", "symbols": [{"literal":"'"}, "sqstring$ebnf$1", {"literal":"'"}], "postprocess": d => d[1].join("")},
    {"name": "dstrchar", "symbols": [/[^\\"\n]/], "postprocess": id},
    {"name": "dstrchar", "symbols": [{"literal":"\\"}, "strescape"], "postprocess": d => JSON.parse("\""+d.join("")+"\"")},
    {"name": "sstrchar", "symbols": [/[^\\'\n]/], "postprocess": id},
    {"name": "sstrchar", "symbols": [{"literal":"\\"}, "strescape"], "postprocess": d => JSON.parse("\""+d.join("")+"\"")},
    {"name": "sstrchar$string$1", "symbols": [{"literal":"\\"}, {"literal":"'"}], "postprocess": (d) => d.join('')},
    {"name": "sstrchar", "symbols": ["sstrchar$string$1"], "postprocess": d => "'"},
    {"name": "strescape", "symbols": [/["\\\/bfnrt]/], "postprocess": id}
  ],
  ParserStart: "main",
};

export default grammar;
