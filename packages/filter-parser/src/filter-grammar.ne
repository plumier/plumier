@builtin "whitespace.ne"
@preprocessor typescript

main 
    -> _ binary _ {% d => d[1] %}

# -------------- parenthesis EXPRESSION 

@{%
    function parenthesis(d:any[]) {
        return { type: "Parenthesis", expr: d[2] }
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
    -> "!"i _ parenthesis {% unary("not") %}
    | "!"i _ prop {% unary("not") %}
    |  parenthesis {% id %}

binary 
    -> binary _ "or"i  _ unary {% binary("or")  %}
    |  binary _ "and"i _ unary {% binary("and") %}
    |  unary {% id %}

# -------------- COMPARISON EXPRESSION 

@{%
    function compare(name:string) {
        return (d:any[]) => ({ type: "Comparison", name, ...d[0], ...d[4] })
    }
%}

comparison 
    -> atom _  ">" _ atom {% compare("gt") %}
    |  atom _  "<" _ atom {% compare("lt") %}
    |  atom _ ">=" _ atom {% compare("gte") %}
    |  atom _ "<=" _ atom {% compare("lte") %}
    |  atom _ "!=" _ atom {% compare("ne") %}
    |  prop _  "=" _ range {% compare("range") %}
    |  prop _  "=" _ contains {% compare("contains") %}
    |  prop _  "=" _ starts_with {% compare("startsWith") %}
    |  prop _  "=" _ ends_with {% compare("endsWith") %}
    |  atom _  "=" _ atom {% compare("eq") %}

# -------------- SPECIAL PRIMITIVES

@{% 
    function join(d:any[]) { 
        return d.map(x => Array.isArray(x) ? x.join("") : (x + "")).join("")
    }
%}

atom 
    -> value {% id %} | prop {% id %} | str_start_with {% id %}

prop  
    -> [a-zA-Z_]:+ [0-9]:* {% d => ({ prop: join(d) })  %}  

value 
    -> primitive {% d => ({ value: d[0] }) %}

# -------------- SPECIAL PRIMITIVES 

range 
    -> "(" _ range _ ")" {% d => d[2] %}
    | string _ "to"i _ string {% d => ({ value: [d[0],d[4]] }) %}
    | number _ "to"i _ number {% d => ({ value: [d[0],d[4]] }) %}

contains 
    -> quote "*" .:+ "*" quote {% d => ({ value: join(d[2]) }) %}

starts_with 
    -> quote [^\*] .:+ "*" quote {% d => ({ value: join([d[1], ...d[2]]) }) %}

ends_with 
    -> quote "*" .:+ [^\*] quote {% d => ({ value: join([...d[2], d[3]]) }) %}

# -------------- PRIMITIVES

primitive 
    -> string {% id %} 
    | number {% id %} 
    | boolean {% id %}

boolean 
    -> "true"i {% d => true %} 
    | "false"i {% d => false %}

string
    -> quote .:* quote {%  d => join(d[1]) %}
    | quote .:* quote {% d => join(d[1]) %}

quote 
    -> "\"" {% id %} | "'" {% id %}

number
    -> [0-9]:+ {% d => parseInt(join(d)) %}
    | [0-9]:+ "." [0-9]:+ {% d => parseFloat(join(d)) %}