@builtin "whitespace.ne"
@preprocessor typescript

main 
    -> _ or _ {% d => d[1] %}

# -------------- LOGIC EXPRESSION 

@{%
    function comparison(operator:string) {
        //console.log("ComparisonExpression", operator)
        return (d:any[], col?:number) => ({ kind: "ComparisonExpression", operator, left: d[0], right: d[4], col })
    }
    function logic(operator:string) {
        //console.log("LogicalExpression", operator)
        return (d:any[], col?:number) => ({ kind: "LogicalExpression", operator, left: d[0], right: d[4], col })
    }
    function unary(operator:string) {
        //console.log("UnaryExpression", operator)
        return (d:any[], col?:number) => ({ kind: "UnaryExpression", operator, argument: d[2], col })
    }
%}

comparison 
    -> atom _  ">" _ atom {% comparison("gt") %}
    |  atom _  "<" _ atom {% comparison("lt") %}
    |  atom _ ">=" _ atom {% comparison("gte") %}
    |  atom _ "<=" _ atom {% comparison("lte") %}
    |  atom _ "!=" _ atom {% comparison("ne") %}
    |  atom _  "=" _ atom {% comparison("eq") %}
    |  prop _ "=" _ string_like {% comparison("like") %}
    |  prop _ "=" _ string_range {% comparison("range") %}

group 
    -> "(" _ group _ ")" {% d => d[2] %}
    | "(" _ or _ ")" {% d => d[2] %}
    |  comparison {% id %}

unary 
    -> "!" _ unary {% unary("not") %}
    | "!" _ or {% unary("not") %}
    |  group {% id %}

and 
    -> and __ "and"i __ unary {% logic("and") %}
    |  unary {% id %}

or 
    -> or __ "or"i  __ and {% logic("or")  %}
    |  and {% id %}


# -------------- PRIMITIVES

@{%
    function join(d:any[]) { 
        return d.map(x => Array.isArray(x) ? x.join("") : (x + "")).join("")
    }

    function literal(annotation:string, value: any, col?:number, preference?:string) {
        //console.log("Literal", annotation, value)
        return { kind: "Literal", annotation, value, preference: preference ?? "none", col } 
    }

    function property(d:any[], loc?:number, reject?:any) {
        const value = join(d)
        // check if property but not (false, true, null)
        if(/^(?!(false|true|null)$)[a-zA-Z_]+[a-zA-Z0-9_]*$/i.test(value)) {
            return literal("Property", value, loc)
        }
        else 
            return reject
    }
%}

atom 
    -> string {% id %} 
    | number {% id %}
    | group {% id %}
    | prop {% id %}
    | boolean {% id %}
    | nullish {% id %}


nullish
    -> "null"i {% (d, c) => literal("Null", undefined, c) %}

boolean 
    -> "true"i {% (d, c) => literal("Boolean", true, c) %} 
    | "false"i {% (d, c) => literal("Boolean", false, c) %}

prop  
    -> [a-zA-Z_]:+ [a-zA-Z0-9_]:* {% property  %}  
    
    
number
    -> [0-9]:+ {% (d, c) => literal("Number", parseInt(join(d)), c) %}
    | [0-9]:+ "." [0-9]:+ {% (d, c) => literal("Number", parseFloat(join(d)), c) %}

string_contains
    -> "*" native_string "*" {% (d, c) => literal("String", d[1], c, "contains") %}

string_like 
    -> "*" native_string {% (d, c) => literal("String", d[1], c, "endsWith") %}
    | native_string "*" {% (d, c) => literal("String", d[0], c, "startsWith") %}
    | string_contains {% id %}

range_group 
    -> "(" _ string_range _ ")" {% (d, c) => d[2] %}
    
string_range
    -> string _ "..." _ string {% (d, c) => literal("String", [d[0].value, d[4].value], c, "range")%}
    | number _ "..." _ number {% (d, c) => literal("Number", [d[0].value, d[4].value], c, "range")%}
    | range_group

string
    -> native_string {% (d, c) => literal("String", d[0], c) %}

native_string
    -> sqstring {% id %}
    |  dqstring {% id %}

dqstring 
    -> "\"" dstrchar:* "\"" {% d => d[1].join("") %}

sqstring 
    -> "'"  sstrchar:* "'"  {% d => d[1].join("") %}

dstrchar -> [^\\"\n] {% id %}
    | "\\" strescape {% d => JSON.parse("\""+d.join("")+"\"") %}

sstrchar -> [^\\'\n] {% id %}
    | "\\" strescape {% d => JSON.parse("\""+d.join("")+"\"") %}
    | "\\'" {% d => "'" %}

strescape 
    -> ["\\/bfnrt] {% id %}