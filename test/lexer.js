var vows = require("vows"),
    assert = require("assert"),
    lexer = require("../lib/lexer.js");

var ind = {id: "(indent)", value: 0},
    str = {id: "(string)", value: "x"},
    str2 = {id: "(string)", value: "a"},
    bol = {id: "**", value: "**"},
    ita = {id: "*", value: "*"};
    ws8 = "        ";
    
vows.describe("Lexer Tests").addBatch({
    /*
    "The inline_token function": {
        topic: lexer,
        "creates a token when supplied with a match": function(lexer) {
            var matches = /(a)|(b)/.exec("cacbc");
            assert.deepEqual(lexer.inline_token(matches), {id: "a", value: "a"});
        },
        "creates the right token if the nth group is captured": function(lexer) {
            var matches = /(a)|(b)/.exec("cccbc");
            assert.deepEqual(lexer.inline_token(matches), {id: "b", value: "b"});
        },
        "does not create a token when the input is null": function(lexer) {
            var matches = /(a)|(b)/.exec("c");
            assert.equal(lexer.inline_token(matches), undefined);
        },
        "does not create a token if all match elements are bogus": function(lexer) {
            var matches = [undefined, undefined];
            assert.equal(lexer.inline_token(matches), undefined);
        }
    },*/

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
        topic: lexer,
        
        "converts a string token at a line's start": function(lexer) {
            var token = lexer.string_token("0123456789", 0, 7);
            assert.equal(token.id, "(string)");
            assert.equal(token.value, "0123456");
        },
        "trims leading whitespace when at a line's start": function(lexer) {
            var token = lexer.string_token("  23456789", 0, 7);
            assert.equal(token.id, "(string)");
            assert.equal(token.value, "23456");
        },
        "converts a string token from a line's middle": function(lexer) {
            var token = lexer.string_token("  23456789", 4, 7);
            assert.equal(token.id, "(string)");
            assert.equal(token.value, "456");
        },
        "converts a string token from a line's end": function(lexer) {
            var token = lexer.string_token("  23456789", 4);
            assert.equal(token.id, "(string)");
            assert.equal(token.value, "456789");
        },
        "returns null rather than an empty string token": function(lexer) {
            assert.equal(lexer.string_token("", 0, null));
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
        "returns [[IND,STR2,BOL,STR,BOL,STR2]] for bold text surrounded by strings": function(lexer) {
            assert.deepEqual(lexer.lex("a**x**a"), [[ind, str2, bol, str, bol, str2]]);
        },
        "returns [[IND,ITA,STR,ITA]] for italic text": function(lexer) {
            assert.deepEqual(lexer.lex("*x*"), [[ind, ita, str, ita]]);
        },
        "returns [[IND,STR]] for a plain string line": function(lexer) {
            assert.deepEqual(lexer.lex("x"), [[ind, str]]);
        }
    },
    
    // SPECIFICATION:
    // - must be preceded by whitespace, begin text block (equiv to preceded by indent token), or:
    //    ' " ( [ { < - / :
    //    U+2018, U+201C, U+2019, U+00AB, U+00A1, U+00BF
    //    U+2010, U+2011, U+2012, U+2013, U+2014, U+00A0 (precede or follow either start or finish)
    // - must be followed by non whitespace or 
    //    U+2010, U+2011, U+2012, U+2013, U+2014, U+00A0 (precede or follow either start or finish)
    // - start token preceded by '"([{<, cannot be immediately followed by corresponding '")]}<.
    "The is_inline_start_token function": {
        topic: lexer,
        
        "BOGUS test": function(lexer) {
            assert.equal(true, true);
        }
        
    },
    
    // SPECIFICATION:
    // - must be preceded by non-whitespace or:
    //    U+2010, U+2011, U+2012, U+2013, U+2014, U+00A0 (precede or follow either start or finish)
    // - must be followed by whitespace, end text block (equiv to undefined), or:
    //    ' " ) ] } > - / : . , ; ! ? \
    //    U+2019, U+201D, U+00BB
    //    U+2010, U+2011, U+2012, U+2013, U+2014, U+00A0 (precede or follow either start or finish)
    "The is_inline_end_token_function": {
        topic: lexer,
        
        "BOGUS test": function(lexer) {
            assert.equal(true, true);
        }
    }

}).export(module);
