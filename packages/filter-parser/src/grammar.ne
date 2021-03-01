@builtin "whitespace.ne"
@builtin "string.ne"
@preprocessor typescript

main 
    -> _ or _ {% d => d[1] %}

# -------------- LOGIC EXPRESSION 

@{%
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
%}

range 
    -> prop _ "=" _ range_value {% binary("range") %}

comparison 
    -> atom _  ">" _ atom {% binary("gt") %}
    |  atom _  "<" _ atom {% binary("lt") %}
    |  atom _ ">=" _ atom {% binary("gte") %}
    |  atom _ "<=" _ atom {% binary("lte") %}
    |  atom _ "!=" _ atom {% binary("ne") %}
    |  atom _  "=" _ atom {% binary("eq") %}
    |  prop _ "*="i _ string {% like %}
    |  range {% id %}

group 
    -> "(" _ group _ ")" {% d => d[2] %}
    | "(" _ or _ ")" {% d => d[2] %}
    | "(" _ atom _ ")" {% d => d[2] %}
    |  comparison {% id %}

unary 
    -> "!"i _ unary {% unary("not") %}
    | "!"i _ or {% unary("not") %}
    | "!"i _ prop {% unary("not") %}
    |  group {% id %}

and 
    -> and _ "and"i _ unary {% binary("and") %}
    |  unary {% id %}

or 
    -> or _ "or"i  _ and {% binary("or")  %}
    |  and {% id %}


# -------------- PRIMITIVES

@{%
    function join(d:any[]) { 
        return d.map(x => Array.isArray(x) ? x.join("") : (x + "")).join("")
    }

    function literal(kind:string, value: any, preference?:string) {
        return !!preference ? { kind, value, preference } : { kind, value }
    }
%}

atom 
    -> string {% id %} 
    | number {% id %}
    | prop {% id %}
    | group {% id %}

boolean 
    -> "true"i {% d => literal("Boolean", true) %} 
    | "false"i {% d => literal("Boolean", false) %}

prop  
    -> [a-zA-Z_]:+ [0-9]:* {% d => literal("Property", join(d))  %}  
    | boolean {% id %}

number
    -> [0-9]:+ {% d => literal("Number", parseInt(join(d))) %}
    | [0-9]:+ "." [0-9]:+ {% d => literal("Number", parseFloat(join(d))) %}

string
    -> native_string {% d => literal("String", d[0], "none") %}

native_string
    -> sqstring {% id %}
    |  dqstring {% id %}

range_group 
    -> "(" _ range_value _ ")" {% d => d[2] %}
    
range_value
    -> string _ "to"i _ string {% d => literal("String", [d[0].value, d[4].value])%}
    | number _ "to"i _ number {% d => literal("Number", [d[0].value, d[4].value])%}
    | range_group
