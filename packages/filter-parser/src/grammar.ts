// Generated automatically by nearley, version 2.20.1
// http://github.com/Hardmath123/nearley
// Bypasses TS6133. Allow declared but unused functions.
// @ts-ignore
function id(d: any[]): any { return d[0]; }

    function binary(operator:string) {
        return (d:any[]) => ({ kind: "BinaryExpression", operator, left: d[0], right: d[4] })
    }
    function unary(operator:string) {
        return (d:any[]) => ({ type: "UnaryExpression", operator, argument: d[2] })
    }
    function like(d:any[]) {
        const str:string = d[4].value
        let right: any
        if(str.startsWith("*") && str.endsWith("*"))
            right = { kind: "String", preference: "contains", value: str.slice(1, -1) }
        else if(str.startsWith("*"))
            right = { kind: "String", preference: "endsWith", value: str.substring(1) }
        else if(str.endsWith("*"))
            right = { kind: "String", preference: "startsWith", value: str.slice(0, -1) }
        else
            right = { kind: "String", preference: "none", value: str }
        return { type: "BinaryExpression", operator: "like", left: d[0], right }
    }


    function join(d:any[]) { 
        return d.map(x => Array.isArray(x) ? x.join("") : (x + "")).join("")
    }

    function literal(kind:string, value: any, preference?:string) {
        return !!preference ? { kind, value, preference } : { kind, value }
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
    {"name": "dqstring$ebnf$1", "symbols": []},
    {"name": "dqstring$ebnf$1", "symbols": ["dqstring$ebnf$1", "dstrchar"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "dqstring", "symbols": [{"literal":"\""}, "dqstring$ebnf$1", {"literal":"\""}], "postprocess": function(d) {return d[1].join(""); }},
    {"name": "sqstring$ebnf$1", "symbols": []},
    {"name": "sqstring$ebnf$1", "symbols": ["sqstring$ebnf$1", "sstrchar"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "sqstring", "symbols": [{"literal":"'"}, "sqstring$ebnf$1", {"literal":"'"}], "postprocess": function(d) {return d[1].join(""); }},
    {"name": "btstring$ebnf$1", "symbols": []},
    {"name": "btstring$ebnf$1", "symbols": ["btstring$ebnf$1", /[^`]/], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "btstring", "symbols": [{"literal":"`"}, "btstring$ebnf$1", {"literal":"`"}], "postprocess": function(d) {return d[1].join(""); }},
    {"name": "dstrchar", "symbols": [/[^\\"\n]/], "postprocess": id},
    {"name": "dstrchar", "symbols": [{"literal":"\\"}, "strescape"], "postprocess": 
        function(d) {
            return JSON.parse("\""+d.join("")+"\"");
        }
        },
    {"name": "sstrchar", "symbols": [/[^\\'\n]/], "postprocess": id},
    {"name": "sstrchar", "symbols": [{"literal":"\\"}, "strescape"], "postprocess": function(d) { return JSON.parse("\""+d.join("")+"\""); }},
    {"name": "sstrchar$string$1", "symbols": [{"literal":"\\"}, {"literal":"'"}], "postprocess": (d) => d.join('')},
    {"name": "sstrchar", "symbols": ["sstrchar$string$1"], "postprocess": function(d) {return "'"; }},
    {"name": "strescape", "symbols": [/["\\\/bfnrt]/], "postprocess": id},
    {"name": "strescape", "symbols": [{"literal":"u"}, /[a-fA-F0-9]/, /[a-fA-F0-9]/, /[a-fA-F0-9]/, /[a-fA-F0-9]/], "postprocess": 
        function(d) {
            return d.join("");
        }
        },
    {"name": "main", "symbols": ["_", "or", "_"], "postprocess": d => d[1]},
    {"name": "range", "symbols": ["prop", "_", {"literal":"="}, "_", "range_value"], "postprocess": binary("range")},
    {"name": "comparison", "symbols": ["atom", "_", {"literal":">"}, "_", "atom"], "postprocess": binary("gt")},
    {"name": "comparison", "symbols": ["atom", "_", {"literal":"<"}, "_", "atom"], "postprocess": binary("lt")},
    {"name": "comparison$string$1", "symbols": [{"literal":">"}, {"literal":"="}], "postprocess": (d) => d.join('')},
    {"name": "comparison", "symbols": ["atom", "_", "comparison$string$1", "_", "atom"], "postprocess": binary("gte")},
    {"name": "comparison$string$2", "symbols": [{"literal":"<"}, {"literal":"="}], "postprocess": (d) => d.join('')},
    {"name": "comparison", "symbols": ["atom", "_", "comparison$string$2", "_", "atom"], "postprocess": binary("lte")},
    {"name": "comparison$string$3", "symbols": [{"literal":"!"}, {"literal":"="}], "postprocess": (d) => d.join('')},
    {"name": "comparison", "symbols": ["atom", "_", "comparison$string$3", "_", "atom"], "postprocess": binary("ne")},
    {"name": "comparison", "symbols": ["atom", "_", {"literal":"="}, "_", "atom"], "postprocess": binary("eq")},
    {"name": "comparison$subexpression$1", "symbols": [{"literal":"*"}, {"literal":"="}], "postprocess": function(d) {return d.join(""); }},
    {"name": "comparison", "symbols": ["prop", "_", "comparison$subexpression$1", "_", "string"], "postprocess": like},
    {"name": "comparison", "symbols": ["range"], "postprocess": id},
    {"name": "group", "symbols": [{"literal":"("}, "_", "group", "_", {"literal":")"}], "postprocess": d => d[2]},
    {"name": "group", "symbols": [{"literal":"("}, "_", "or", "_", {"literal":")"}], "postprocess": d => d[2]},
    {"name": "group", "symbols": [{"literal":"("}, "_", "atom", "_", {"literal":")"}], "postprocess": d => d[2]},
    {"name": "group", "symbols": ["comparison"], "postprocess": id},
    {"name": "unary$subexpression$1", "symbols": [{"literal":"!"}], "postprocess": function(d) {return d.join(""); }},
    {"name": "unary", "symbols": ["unary$subexpression$1", "_", "unary"], "postprocess": unary("not")},
    {"name": "unary$subexpression$2", "symbols": [{"literal":"!"}], "postprocess": function(d) {return d.join(""); }},
    {"name": "unary", "symbols": ["unary$subexpression$2", "_", "or"], "postprocess": unary("not")},
    {"name": "unary$subexpression$3", "symbols": [{"literal":"!"}], "postprocess": function(d) {return d.join(""); }},
    {"name": "unary", "symbols": ["unary$subexpression$3", "_", "prop"], "postprocess": unary("not")},
    {"name": "unary", "symbols": ["group"], "postprocess": id},
    {"name": "and$subexpression$1", "symbols": [/[aA]/, /[nN]/, /[dD]/], "postprocess": function(d) {return d.join(""); }},
    {"name": "and", "symbols": ["and", "_", "and$subexpression$1", "_", "unary"], "postprocess": binary("and")},
    {"name": "and", "symbols": ["unary"], "postprocess": id},
    {"name": "or$subexpression$1", "symbols": [/[oO]/, /[rR]/], "postprocess": function(d) {return d.join(""); }},
    {"name": "or", "symbols": ["or", "_", "or$subexpression$1", "_", "and"], "postprocess": binary("or")},
    {"name": "or", "symbols": ["and"], "postprocess": id},
    {"name": "atom", "symbols": ["string"], "postprocess": id},
    {"name": "atom", "symbols": ["number"], "postprocess": id},
    {"name": "atom", "symbols": ["prop"], "postprocess": id},
    {"name": "atom", "symbols": ["group"], "postprocess": id},
    {"name": "boolean$subexpression$1", "symbols": [/[tT]/, /[rR]/, /[uU]/, /[eE]/], "postprocess": function(d) {return d.join(""); }},
    {"name": "boolean", "symbols": ["boolean$subexpression$1"], "postprocess": d => literal("Boolean", true)},
    {"name": "boolean$subexpression$2", "symbols": [/[fF]/, /[aA]/, /[lL]/, /[sS]/, /[eE]/], "postprocess": function(d) {return d.join(""); }},
    {"name": "boolean", "symbols": ["boolean$subexpression$2"], "postprocess": d => literal("Boolean", false)},
    {"name": "prop$ebnf$1", "symbols": [/[a-zA-Z_]/]},
    {"name": "prop$ebnf$1", "symbols": ["prop$ebnf$1", /[a-zA-Z_]/], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "prop$ebnf$2", "symbols": []},
    {"name": "prop$ebnf$2", "symbols": ["prop$ebnf$2", /[0-9]/], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "prop", "symbols": ["prop$ebnf$1", "prop$ebnf$2"], "postprocess": d => literal("Property", join(d))},
    {"name": "prop", "symbols": ["boolean"], "postprocess": id},
    {"name": "number$ebnf$1", "symbols": [/[0-9]/]},
    {"name": "number$ebnf$1", "symbols": ["number$ebnf$1", /[0-9]/], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "number", "symbols": ["number$ebnf$1"], "postprocess": d => literal("Number", parseInt(join(d)))},
    {"name": "number$ebnf$2", "symbols": [/[0-9]/]},
    {"name": "number$ebnf$2", "symbols": ["number$ebnf$2", /[0-9]/], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "number$ebnf$3", "symbols": [/[0-9]/]},
    {"name": "number$ebnf$3", "symbols": ["number$ebnf$3", /[0-9]/], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "number", "symbols": ["number$ebnf$2", {"literal":"."}, "number$ebnf$3"], "postprocess": d => literal("Number", parseFloat(join(d)))},
    {"name": "string", "symbols": ["native_string"], "postprocess": d => literal("String", d[0], "none")},
    {"name": "native_string", "symbols": ["sqstring"], "postprocess": id},
    {"name": "native_string", "symbols": ["dqstring"], "postprocess": id},
    {"name": "range_group", "symbols": [{"literal":"("}, "_", "range_value", "_", {"literal":")"}], "postprocess": d => d[2]},
    {"name": "range_value$subexpression$1", "symbols": [/[tT]/, /[oO]/], "postprocess": function(d) {return d.join(""); }},
    {"name": "range_value", "symbols": ["string", "_", "range_value$subexpression$1", "_", "string"], "postprocess": d => literal("String", [d[0].value, d[4].value])},
    {"name": "range_value$subexpression$2", "symbols": [/[tT]/, /[oO]/], "postprocess": function(d) {return d.join(""); }},
    {"name": "range_value", "symbols": ["number", "_", "range_value$subexpression$2", "_", "number"], "postprocess": d => literal("Number", [d[0].value, d[4].value])},
    {"name": "range_value", "symbols": ["range_group"]}
  ],
  ParserStart: "main",
};

export default grammar;
