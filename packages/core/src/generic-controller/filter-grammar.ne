@builtin "whitespace.ne"

@{%
    function join(d) { 
        return d.map(x => Array.isArray(x) ? x.join("") : (x + "")).join("")
    }
%}

main -> group {% id %}

group_parenthesis -> "(" _ group _ ")" {% function(d) { return d[2] } %}
group -> logical {% id %} | comparison {% id %} | group_parenthesis {% id %}

logical -> or {% id %} | and {% id %}

@{%
    function logical(name) {
        return (d) => ({ type: "Logical", name, left: d[0], right: d[4] })
    }
%}

or -> group _ "or"i _ group {% logical("or")  %}

and -> group _ "and"i _ group {% logical("and") %}


comparison -> gt {% id %} | lt {% id %} | gte {% id %} | lte {% id %} | ne {% id %} | eq {% id %}

compare[opr]
    -> prop _ $opr _ value {% function(d) { return { prop: d[0], value: d[4] }} %}
    | value _ $opr _ prop {% function(d) { return { prop: d[4], value: d[0] }} %}

@{%
    function compare(name) {
        return (d) => { 
            return { type: "Comparison", name, ...d[0] }
        } 
    }
%}

gt  -> compare[">"] {% compare("gt") %}
lt  -> compare["<"] {% compare("lt") %}
gte -> compare[">="] {% compare("gte") %}
lte -> compare["<="] {% compare("lte") %}
ne  -> compare["!="] {% compare("ne") %}
eq  -> compare["="] {% compare("eq") %}

prop  -> [a-zA-Z_]:+ [0-9]:* {% join %}

value -> string {% id %} | number {% id %}

boolean -> "true" | "false"

string
    -> "\"" .:* "\"" {% join %}
    | "'" .:* "'" {% join %}

number
    -> [0-9]:+ {% function(d) { return parseInt(join(d)) } %}
    | [0-9]:+ "." [0-9]:+ {% function(d) { return parseFloat(join(d)) } %}
