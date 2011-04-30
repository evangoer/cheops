var vows = require("vows"),
    assert = require("assert"),
    lexer = require("../lib/lexer.js");

var tok = function(value, id) {
    var token = {};
    token.id = id || value;
    token.value = value;
    return token;
}
var s = function(value) {
    return tok(value, "(string)");
}

var ind =     tok(0, "(indent)"),
    str =     s("x");
    bol =     tok("**"),
    ita =     tok("*"),
    interp =  tok("`"),
    lit =     tok("``"),
    sub =     tok("|"),
    tgt =     tok("_`"),
    foot1 =   tok("["),
    foot2 =   tok("]_"),
    link =    tok("`_"),
    ws8 =     "        ",
    pattern = "\\*\\*|\\*(?!\\*)|_`|`_|``|:[\\w\\.\\-]*:`|`:[\\w\\.\\-]*:|`(?!`)|\\||\\[|\\]_"; // fake, use the real one later
    
vows.describe("Lexer Tests").addBatch({
    "The inline_token function": {
        topic: function() { return lexer.inline_token },
        
        "returns BOL,BOL from '**a**'": function(inline_token) {
            var re = new RegExp(pattern, "g");
            var test_str = "**a**";
            assert.deepEqual(inline_token(re.exec(test_str)), bol);
            assert.deepEqual(inline_token(re.exec(test_str)), bol);
        },
        "returns BOL,STR_BOL from '**a**a'": function(inline_token) {
            var re = new RegExp(pattern, "g");
            var test_str = "**a**a";
            assert.deepEqual(inline_token(re.exec(test_str)), bol);
            assert.deepEqual(inline_token(re.exec(test_str)), s("**"));
        },
        "returns STR_BOL,BOL from 'a**a**'": function(inline_token) {
            var re = new RegExp(pattern, "g");
            var test_str = "a**a**";
            assert.deepEqual(inline_token(re.exec(test_str)), s("**"));
            assert.deepEqual(inline_token(re.exec(test_str)), bol);
        },
        "returns ITA,ITA from '*a*'": function(inline_token) {
            var re = new RegExp(pattern, "g");
            var test_str = "*a*";
            assert.deepEqual(inline_token(re.exec(test_str)), ita);
            assert.deepEqual(inline_token(re.exec(test_str)), ita);
        },
        "returns LIT,LIT from '``a``'": function(inline_token) {
            var re = new RegExp(pattern, "g");
            var test_str = "``a``";
            assert.deepEqual(inline_token(re.exec(test_str)), lit);
            assert.deepEqual(inline_token(re.exec(test_str)), lit);
        },
        "returns INTERP,INTERP from '`a`'": function(inline_token) {
            var re = new RegExp(pattern, "g");
            var test_str = "`a`";
            assert.deepEqual(inline_token(re.exec(test_str)), interp);
            assert.deepEqual(inline_token(re.exec(test_str)), interp);
        },
        "returns SUB,SUB from '|a|'": function(inline_token) {
            var re = new RegExp(pattern, "g");
            var test_str = "|a|";
            assert.deepEqual(inline_token(re.exec(test_str)), sub);
            assert.deepEqual(inline_token(re.exec(test_str)), sub);
        },
        "returns TGT,INTERP from '_`a`'": function(inline_token) {
            var re = new RegExp(pattern, "g");
            var test_str = "_`a`";
            assert.deepEqual(inline_token(re.exec(test_str)), tgt);
            assert.deepEqual(inline_token(re.exec(test_str)), interp);
        },
        "returns FOOT1,FOOT2 from '[a]_'": function(inline_token) {
            var re = new RegExp(pattern, "g");
            var test_str = "[a]_";
            assert.deepEqual(inline_token(re.exec(test_str)), foot1);
            assert.deepEqual(inline_token(re.exec(test_str)), foot2);
        },
        "returns INTERP,LINK from '`a`_'": function(inline_token) {
            var re = new RegExp(pattern, "g");
            var test_str = "`a`_";
            assert.deepEqual(inline_token(re.exec(test_str)), interp);
            assert.deepEqual(inline_token(re.exec(test_str)), link);
        },
        "returns [ROLE,INTERP],INTERP from ':a:`b`'": function(inline_token) {
            var re = new RegExp(pattern, "g");
            var test_str = ":a:`b`";
            assert.deepEqual(inline_token(re.exec(test_str)), [tok("a", "(role)"), interp]);
            assert.deepEqual(inline_token(re.exec(test_str)), interp);
        },
        "returns INTERP,[INTERP,ROLE] from '`b`:a:'": function(inline_token) {
            var re = new RegExp(pattern, "g");
            var test_str = "`b`:a:";
            assert.deepEqual(inline_token(re.exec(test_str)), interp);
            assert.deepEqual(inline_token(re.exec(test_str)), [interp, tok("a", "(role)")]);
        },
    },
    "Role names" : {
        topic: lexer,
        
        "may not contain special characters beyond . _ -": function(lexer) {
            assert.deepEqual(lexer.lex(":$:`x`"),   [[ind, s(":$:"), interp, str, interp]]);
            assert.deepEqual(lexer.lex(":a%:`x`"),  [[ind, s(":a%:"), interp, str, interp]]);
            assert.deepEqual(lexer.lex(":^a:`x`"),  [[ind, s(":^a:"), interp, str, interp]]);
            assert.deepEqual(lexer.lex(":a&a:`x`"), [[ind, s(":a&a:"), interp, str, interp]]);
        },
        "may not begin with ASCII chars . _ -": function(lexer) {
            var re = new RegExp(pattern);
            assert.deepEqual(lexer.inline_token(re.exec(":.a:`b`")), [s(":.a:"), interp]);
            assert.deepEqual(lexer.inline_token(re.exec(":_a:`b`")), [s(":_a:"), interp]);
            assert.deepEqual(lexer.inline_token(re.exec(":-a:`b`")), [s(":-a:"), interp]);
        },
        "may not end with ASCII chars . _ -": function(lexer) {
            var re = new RegExp(pattern);
            assert.deepEqual(lexer.inline_token(re.exec(":a.:`b`")), [s(":a.:"), interp]);
            assert.deepEqual(lexer.inline_token(re.exec(":a_:`b`")), [s(":a_:"), interp]);
            assert.deepEqual(lexer.inline_token(re.exec(":a-:`b`")), [s(":a-:"), interp]);
        },
        "may contain multiple interior ASCII chars . _ - in a row": function(lexer) {
            var re = new RegExp(pattern);
            assert.deepEqual(lexer.inline_token(re.exec(":a.a..a:`b`")), [tok("a.a..a", "(role)"), interp]);
            assert.deepEqual(lexer.inline_token(re.exec(":a--a.a:`b`")), [tok("a--a.a", "(role)"), interp]);
            assert.deepEqual(lexer.inline_token(re.exec(":a.__-a:`b`")), [tok("a.__-a", "(role)"), interp]);
        }
    },
    "The tabs_to_spaces function": {
        topic: lexer,
        
        "converts 0s to 0s": function (lexer) {
            assert.equal(lexer.tabs_to_spaces(""), "");
        },
        "converts 7s to 7s": function(lexer) {
            assert.equal(lexer.tabs_to_spaces("       "), "       ");
        },
        "converts 9s to 9s": function(lexer) {
            assert.equal(lexer.tabs_to_spaces("         "), ws8 + " ");
        },
        "converts 1t to 8s": function(lexer) {
            assert.equal(lexer.tabs_to_spaces("\t"), ws8);
        },
        "converts 2t to 16s": function(lexer) {
            assert.equal(lexer.tabs_to_spaces("\t\t"), ws8 + ws8);
        },
        "converts 1s1t to 8s": function(lexer) {
            assert.equal(lexer.tabs_to_spaces(" \t"), ws8);
        },
        "converts 9s1t to 16s": function(lexer) {
            assert.equal(lexer.tabs_to_spaces("         \t"), ws8 + ws8);
        },
        "converts 7s1t to 8s": function(lexer) {
            assert.equal(lexer.tabs_to_spaces("       \t"), ws8);
        },
        "converts 1t7s to 15s": function(lexer) {
            assert.equal(lexer.tabs_to_spaces("\t       "), ws8 + "       ");
        },
        "converts 1t9s1t to 24s": function(lexer) {
            assert.equal(lexer.tabs_to_spaces("\t         \t"), ws8 + ws8 + ws8);
        },
        "converts 1v1s1f1t to 8s": function(lexer) {
            assert.equal(lexer.tabs_to_spaces("\v \f\t"), ws8);
        }
    },
    
    "The indent_token function": {
        topic: lexer,
        
        "converts 4 leading spaces to a length 4 indent token": function(lexer) {
            assert.deepEqual(lexer.indent_token("    X "), {id: "(indent)", value: 4});
        },
        "converts 0 leading spaces to a length 0 indent token": function(lexer) {
            assert.deepEqual(lexer.indent_token("X   X "), ind);
        },
        "converts a leading '\\f \\t\\v' to a length 9 indent token": function(lexer) {
            assert.deepEqual(lexer.indent_token("\f \t\vX "), {id: "(indent)", value: 9});
        }
    }, 
    
    "The string_token function": {
        topic: function() { return lexer.string_token },
        
        "converts a string token at a line's start": function(string_token) {
            assert.deepEqual(string_token("0123456789", 0, 7), s("0123456"));
        },
        "trims leading whitespace when at a line's start": function(string_token) {
            assert.deepEqual(string_token("  23456789", 0, 7), s("23456"));
        },
        "converts a string token from a line's middle": function(string_token) {
            assert.deepEqual(string_token("  23456789", 4, 7), s("456"));
        },
        "converts a string token from a line's end": function(string_token) {
            assert.deepEqual(string_token("  23456789", 4), s("456789"));
        },
        "returns null rather than an empty string token": function(string_token) {
            assert.equal(string_token("", 0), null);
        }
    },
    
    "The lex function": {
        topic: lexer,
        
        "returns [] for non-string input": function(lexer) {
            assert.deepEqual(lexer.lex(null), []);
        },
        "returns [[IND]] for an empty string": function(lexer) {
            assert.deepEqual(lexer.lex(""), [[ind]]);
        },
        "returns [[IND],[IND]] for two empty lines": function(lexer) {
            assert.deepEqual(lexer.lex("\r\n"), [[ind], [ind]]);
        },
        "returns [[IND,BOL,STR,BOL]] for bold text": function(lexer) {
            assert.deepEqual(lexer.lex("**x**"), [[ind, bol, str, bol]]);
        },
        "returns [[IND,STR,STR_BOL,STR,STR_BOL,STR]] for 'bold' wrapped in non-whitepace": function(lexer) {
            assert.deepEqual(lexer.lex("a**x**a"), [[ind, s("a"), s("**"), str, s("**"), s("a")]]);
        },
        "returns [[IND,ITA,STR,ITA]] for italic text": function(lexer) {
            assert.deepEqual(lexer.lex("*x*"), [[ind, ita, str, ita]]);
        },
        "returns [[IND,STR]] for a plain string line": function(lexer) {
            assert.deepEqual(lexer.lex("x"), [[ind, str]]);
        }
    },
    
    "An inline start token": {
        topic: function() { return lexer.is_inline_start },
        
        "must be preceded by": {
            // NOTE: at this point all whitespace is gone or converted to spaces
            "whitespace or a line begin": function(start) {
                assert.equal(start(" ", "x"), true);
                assert.equal(start("", "x"), true);
                assert.equal(start("x", "x"), false);
            },
            "or one of the ASCII chars ' \" ( [ { < - / :": function(start) {
                assert.equal(start("'", "x"), true);
                assert.equal(start("\"", "x"), true);
                assert.equal(start("(", "x"), true);
                assert.equal(start("[", "x"), true);
                assert.equal(start("{", "x"), true);
                assert.equal(start("<", "x"), true);
                assert.equal(start("-", "x"), true);
                assert.equal(start("/", "x"), true);
                assert.equal(start(":", "x"), true);
            },
            "or one of the Unicode chars \u2018 \u201c \u2019 \u00AB \u00A1 \u00BF": function(start) {
                assert.equal(start("\u2018", "x"), true);
                assert.equal(start("\u201c", "x"), true);
                assert.equal(start("\u2019", "x"), true);
                assert.equal(start("\u00AB", "x"), true);
                assert.equal(start("\u00A1", "x"), true);
                assert.equal(start("\u00BF", "x"), true);
            },
            "or one of six Unicode hyphens & space chars (u2010-u2014,u00A0)": function(start) {
                assert.equal(start("\u2010", "x"), true);
                assert.equal(start("\u2011", "x"), true);
                assert.equal(start("\u2012", "x"), true);
                assert.equal(start("\u2013", "x"), true);
                assert.equal(start("\u2014", "x"), true);
                assert.equal(start("\u00A0", "x"), true);
            }
        },
        "must be followed by": {
            "non-whitespace": function(start) {
                assert.equal(start(" ", "x"), true);
                assert.equal(start(" ", " "), false);
            },
            "or one of six Unicode hyphens & space chars (u2010-u2014,u00A0)": function(start) {
                assert.equal(start(" ", "\u2010"), true);
                assert.equal(start(" ", "\u2011"), true);
                assert.equal(start(" ", "\u2012"), true);
                assert.equal(start(" ", "\u2013"), true);
                assert.equal(start(" ", "\u2014"), true);
                assert.equal(start(" ", "\u00A0"), true);
            }
        },
        "cannot be wrapped in": {
            "matching ' chars": function(start) {
                assert.equal(start("'", "'"), false);                
            },
            "matching \" chars": function(start) {
                assert.equal(start("\"", "\""), false);                
            },
            "( and ) chars": function(start) {
                assert.equal(start("(", ")"), false);                
            },
            "[ and ] chars": function(start) {
                assert.equal(start("[", "]"), false);                
            },
            "{ and } chars": function(start) {
                assert.equal(start("{", "}"), false);                
            },
            "< and > chars": function(start) {
                assert.equal(start("{", "}"), false);                
            }
        }
    },
    
    "An inline end token": {
        topic: function() { return lexer.is_inline_end },
        
        "must be preceded by": {
            "non-whitespace": function(end) {
                assert.equal(end("x", " "), true);
                assert.equal(end(" ", " "), false);
            },
            "or one of six Unicode hyphens & space chars (u2010-u2014,u00A0)": function(end) {
                assert.equal(end("\u2010", " "), true);
                assert.equal(end("\u2011", " "), true);
                assert.equal(end("\u2012", " "), true);
                assert.equal(end("\u2013", " "), true);
                assert.equal(end("\u2014", " "), true);
                assert.equal(end("\u00A0", " "), true);
            }
        }, 
        "must be followed by": {
            "whitespace or a line end": function(end) {
                assert.equal(end("x", " "), true);
                assert.equal(end("x", ""), true);
                assert.equal(end("x", "x"), false);
            },
            "or one of the ASCII chars ' \" ) ] } > - / : . , ; ! ? \\": function(end) {
                assert.equal(end("x", "'"), true);
                assert.equal(end("x", "\""), true);
                assert.equal(end("x", ")"), true);
                assert.equal(end("x", "]"), true);
                assert.equal(end("x", "}"), true);
                assert.equal(end("x", ">"), true);
                assert.equal(end("x", "-"), true);
                assert.equal(end("x", "/"), true);
                assert.equal(end("x", ":"), true);
                assert.equal(end("x", "."), true);
                assert.equal(end("x", ","), true);
                assert.equal(end("x", ";"), true);
                assert.equal(end("x", "!"), true);
                assert.equal(end("x", "?"), true);
                assert.equal(end("x", "\\"), true);
            },
            "or one of the Unicode chars \u2019 \u201D \u00BB": function(end) {
                assert.equal(end("x", "\u2019"), true);
                assert.equal(end("x", "\u201D"), true);
                assert.equal(end("x", "\u00BB"), true);
            },
            "or one of six Unicode hyphens & space chars (u2010-u2014,u00A0)": function(end) {
                assert.equal(end("x", "\u2010"), true);
                assert.equal(end("x", "\u2011"), true);
                assert.equal(end("x", "\u2012"), true);
                assert.equal(end("x", "\u2013"), true);
                assert.equal(end("x", "\u2014"), true);
                assert.equal(end("x", "\u00A0"), true);
            }
        }
    }

}).export(module);