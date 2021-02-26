@builtin "whitespace.ne"
@preprocessor typescript

main 
    -> _ binary _ {% d => d[1] %}

# -------------- parenthesis EXPRESSION 

@{%
    function parenthesis(d:any[]) {
        return { type: "Parenthesis", value: d[2] }
    }
%}

parenthesis 
    -> "(" _ parenthesis _ ")" {% parenthesis %}
    |  "(" _ binary _ ")" {% parenthesis %}
    |  comparison {% id %}

# -------------- LOGIC EXPRESSION 

@{%
    function binary(name:string) {
        return (d:any[]) => ({ type: "Binary", name, left: d[0], right: d[4] })
    }
    function unary(name:string) {
        return (d:any[]) => ({ type: "Unary", name, expr: d[2] })
    }
%}

unary 
    -> "not"i __ parenthesis {% unary("not") %}
    | "not"i __ prop {% unary("not") %}
    |  parenthesis {% id %}

binary 
    -> binary __ "or"i  __ unary {% binary("or")  %}
    |  binary __ "and"i __ unary {% binary("and") %}
    |  unary {% id %}

# -------------- COMPARISON EXPRESSION 

@{%
    function compare(name:string) {
        return (d:any[]) => ({ type: "Comparison", name, ...d[0], ...d[4] })
    }
    function like(d:any[]) {
        return { type: "Comparison", name: "like", ...d[0], value: d[4] }
    }
    function between(d:any[]) {
        return { type: "Comparison", name: "between", ...d[0], value: [d[4],d[8]] }
    }
%}

comparison 
    -> atom _  ">" _ atom {% compare("gt") %}
    |  atom _  "<" _ atom {% compare("lt") %}
    |  atom _ ">=" _ atom {% compare("gte") %}
    |  atom _ "<=" _ atom {% compare("lte") %}
    |  atom _ "<>" _ atom {% compare("ne") %}
    |  atom _  "=" _ atom {% compare("eq") %}
    |  prop __ "like" __ string {% like %}
    |  prop __ "between" __ strnum __ "and" __ strnum {% between %}

# -------------- ATOM  = property / value

@{% 
    function join(d:any[]) { 
        return d.map(x => Array.isArray(x) ? x.join("") : (x + "")).join("")
    }
%}

atom -> value {% id %} | prop {% id %}

prop  -> [a-zA-Z_]:+ [0-9]:* {% d => ({ prop: join(d) })  %}  

value -> primitive {% d => ({ value: d[0] }) %}

# -------------- PRIMITIVES

primitive -> string {% id %} | number {% id %} | boolean {% id %}
strnum -> string {% id %} | number {% id %}

boolean 
    -> "true"i {% d => true %} 
    | "false"i {% d => false %}

string
    -> quote .:* quote {%  d => join(d[1]) %}
    | quote .:* quote {% d => join(d[1]) %}

quote -> "\"" {% id %} | "'" {% id %}

number
    -> [0-9]:+ {% d => parseInt(join(d)) %}
    | [0-9]:+ "." [0-9]:+ {% d => parseFloat(join(d)) %}