// Generated automatically by nearley, version 2.20.1
// http://github.com/Hardmath123/nearley
(function () {
function id(x) { return x[0]; }

    function join(d) { 
        return d.map(x => Array.isArray(x) ? x.join("") : (x + "")).join("")
    }


    function logical(name) {
        return (d) => ({ type: "Logical", name, left: d[0], right: d[4] })
    }


    function compare(name) {
        return (d) => { 
            return { type: "Comparison", name, ...d[0] }
        } 
    }
var grammar = {
    Lexer: undefined,
    ParserRules: [
    {"name": "_$ebnf$1", "symbols": []},
    {"name": "_$ebnf$1", "symbols": ["_$ebnf$1", "wschar"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "_", "symbols": ["_$ebnf$1"], "postprocess": function(d) {return null;}},
    {"name": "__$ebnf$1", "symbols": ["wschar"]},
    {"name": "__$ebnf$1", "symbols": ["__$ebnf$1", "wschar"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "__", "symbols": ["__$ebnf$1"], "postprocess": function(d) {return null;}},
    {"name": "wschar", "symbols": [/[ \t\n\v\f]/], "postprocess": id},
    {"name": "main", "symbols": ["group"], "postprocess": id},
    {"name": "group_parenthesis", "symbols": [{"literal":"("}, "_", "group", "_", {"literal":")"}], "postprocess": function(d) { return d[2] }},
    {"name": "group", "symbols": ["logical"], "postprocess": id},
    {"name": "group", "symbols": ["comparison"], "postprocess": id},
    {"name": "group", "symbols": ["group_parenthesis"], "postprocess": id},
    {"name": "logical", "symbols": ["or"], "postprocess": id},
    {"name": "logical", "symbols": ["and"], "postprocess": id},
    {"name": "or$subexpression$1", "symbols": [/[oO]/, /[rR]/], "postprocess": function(d) {return d.join(""); }},
    {"name": "or", "symbols": ["group", "_", "or$subexpression$1", "_", "group"], "postprocess": logical("or")},
    {"name": "and$subexpression$1", "symbols": [/[aA]/, /[nN]/, /[dD]/], "postprocess": function(d) {return d.join(""); }},
    {"name": "and", "symbols": ["group", "_", "and$subexpression$1", "_", "group"], "postprocess": logical("and")},
    {"name": "comparison", "symbols": ["gt"], "postprocess": id},
    {"name": "comparison", "symbols": ["lt"], "postprocess": id},
    {"name": "comparison", "symbols": ["gte"], "postprocess": id},
    {"name": "comparison", "symbols": ["lte"], "postprocess": id},
    {"name": "comparison", "symbols": ["ne"], "postprocess": id},
    {"name": "comparison", "symbols": ["eq"], "postprocess": id},
    {"name": "gt$macrocall$2", "symbols": [{"literal":">"}]},
    {"name": "gt$macrocall$1", "symbols": ["prop", "_", "gt$macrocall$2", "_", "value"], "postprocess": function(d) { return { prop: d[0], value: d[4] }}},
    {"name": "gt$macrocall$1", "symbols": ["value", "_", "gt$macrocall$2", "_", "prop"], "postprocess": function(d) { return { prop: d[4], value: d[0] }}},
    {"name": "gt", "symbols": ["gt$macrocall$1"], "postprocess": compare("gt")},
    {"name": "lt$macrocall$2", "symbols": [{"literal":"<"}]},
    {"name": "lt$macrocall$1", "symbols": ["prop", "_", "lt$macrocall$2", "_", "value"], "postprocess": function(d) { return { prop: d[0], value: d[4] }}},
    {"name": "lt$macrocall$1", "symbols": ["value", "_", "lt$macrocall$2", "_", "prop"], "postprocess": function(d) { return { prop: d[4], value: d[0] }}},
    {"name": "lt", "symbols": ["lt$macrocall$1"], "postprocess": compare("lt")},
    {"name": "gte$macrocall$2$string$1", "symbols": [{"literal":">"}, {"literal":"="}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "gte$macrocall$2", "symbols": ["gte$macrocall$2$string$1"]},
    {"name": "gte$macrocall$1", "symbols": ["prop", "_", "gte$macrocall$2", "_", "value"], "postprocess": function(d) { return { prop: d[0], value: d[4] }}},
    {"name": "gte$macrocall$1", "symbols": ["value", "_", "gte$macrocall$2", "_", "prop"], "postprocess": function(d) { return { prop: d[4], value: d[0] }}},
    {"name": "gte", "symbols": ["gte$macrocall$1"], "postprocess": compare("gte")},
    {"name": "lte$macrocall$2$string$1", "symbols": [{"literal":"<"}, {"literal":"="}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "lte$macrocall$2", "symbols": ["lte$macrocall$2$string$1"]},
    {"name": "lte$macrocall$1", "symbols": ["prop", "_", "lte$macrocall$2", "_", "value"], "postprocess": function(d) { return { prop: d[0], value: d[4] }}},
    {"name": "lte$macrocall$1", "symbols": ["value", "_", "lte$macrocall$2", "_", "prop"], "postprocess": function(d) { return { prop: d[4], value: d[0] }}},
    {"name": "lte", "symbols": ["lte$macrocall$1"], "postprocess": compare("lte")},
    {"name": "ne$macrocall$2$string$1", "symbols": [{"literal":"!"}, {"literal":"="}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "ne$macrocall$2", "symbols": ["ne$macrocall$2$string$1"]},
    {"name": "ne$macrocall$1", "symbols": ["prop", "_", "ne$macrocall$2", "_", "value"], "postprocess": function(d) { return { prop: d[0], value: d[4] }}},
    {"name": "ne$macrocall$1", "symbols": ["value", "_", "ne$macrocall$2", "_", "prop"], "postprocess": function(d) { return { prop: d[4], value: d[0] }}},
    {"name": "ne", "symbols": ["ne$macrocall$1"], "postprocess": compare("ne")},
    {"name": "eq$macrocall$2", "symbols": [{"literal":"="}]},
    {"name": "eq$macrocall$1", "symbols": ["prop", "_", "eq$macrocall$2", "_", "value"], "postprocess": function(d) { return { prop: d[0], value: d[4] }}},
    {"name": "eq$macrocall$1", "symbols": ["value", "_", "eq$macrocall$2", "_", "prop"], "postprocess": function(d) { return { prop: d[4], value: d[0] }}},
    {"name": "eq", "symbols": ["eq$macrocall$1"], "postprocess": compare("eq")},
    {"name": "prop$ebnf$1", "symbols": [/[a-zA-Z_]/]},
    {"name": "prop$ebnf$1", "symbols": ["prop$ebnf$1", /[a-zA-Z_]/], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "prop$ebnf$2", "symbols": []},
    {"name": "prop$ebnf$2", "symbols": ["prop$ebnf$2", /[0-9]/], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "prop", "symbols": ["prop$ebnf$1", "prop$ebnf$2"], "postprocess": join},
    {"name": "value", "symbols": ["string"], "postprocess": id},
    {"name": "value", "symbols": ["number"], "postprocess": id},
    {"name": "boolean$string$1", "symbols": [{"literal":"t"}, {"literal":"r"}, {"literal":"u"}, {"literal":"e"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "boolean", "symbols": ["boolean$string$1"]},
    {"name": "boolean$string$2", "symbols": [{"literal":"f"}, {"literal":"a"}, {"literal":"l"}, {"literal":"s"}, {"literal":"e"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "boolean", "symbols": ["boolean$string$2"]},
    {"name": "string$ebnf$1", "symbols": []},
    {"name": "string$ebnf$1", "symbols": ["string$ebnf$1", /./], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "string", "symbols": [{"literal":"\""}, "string$ebnf$1", {"literal":"\""}], "postprocess": join},
    {"name": "string$ebnf$2", "symbols": []},
    {"name": "string$ebnf$2", "symbols": ["string$ebnf$2", /./], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "string", "symbols": [{"literal":"'"}, "string$ebnf$2", {"literal":"'"}], "postprocess": join},
    {"name": "number$ebnf$1", "symbols": [/[0-9]/]},
    {"name": "number$ebnf$1", "symbols": ["number$ebnf$1", /[0-9]/], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "number", "symbols": ["number$ebnf$1"], "postprocess": function(d) { return parseInt(join(d)) }},
    {"name": "number$ebnf$2", "symbols": [/[0-9]/]},
    {"name": "number$ebnf$2", "symbols": ["number$ebnf$2", /[0-9]/], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "number$ebnf$3", "symbols": [/[0-9]/]},
    {"name": "number$ebnf$3", "symbols": ["number$ebnf$3", /[0-9]/], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "number", "symbols": ["number$ebnf$2", {"literal":"."}, "number$ebnf$3"], "postprocess": function(d) { return parseFloat(join(d)) }}
]
  , ParserStart: "main"
}
if (typeof module !== 'undefined'&& typeof module.exports !== 'undefined') {
   module.exports = grammar;
} else {
   window.grammar = grammar;
}
})();
