var vows = require("vows"),
    assert = require("assert"),
    parser = require("../lib/parser.js");

var tok = function(value, id) {
    var token = {};
    token.id = id || value;
    token.value = value;
    return token;
};
var s = function(value) {
    return tok(value, "(string)");
};
var ind = function(value) {
    return tok(value, "(indent)");
};

var ts_inline = [[s("This is "), tok("**"), s("bold"), tok("**"), s(" text.")]];
var ts_simple = [[ind(0), s("Foo and bar")],[ind(0), s("Baz and zot")]];

// BOGUS, redo (or move to integration tests?)
// var ts_paragraph = [{id:"paragraph"}].concat(ts_inline).concat([{id:"\n\n"}]);

vows.describe("Parser Tests").addBatch({
    "A symbol table": {
        topic: parser,
        
        "responds to define() and get_token()": function(parser) {
            assert.isFunction(parser.symbol);
            assert.isFunction(parser.get_token);
        },
        "can define a bogus symbol": function(parser) {
            var s_bogus = parser.symbol("(bogus)");
            assert.equal(s_bogus.id, "(bogus)");
        },
        "can get a bogus symbol once it is defined": function(parser) {
            var t_bogus = parser.get_token(tok("(bogus)"));
            assert.equal(t_bogus.id, "(bogus)");
        },
        "can get a predefined bold token": function(parser) {
            var t_bold = parser.get_token(tok("**"));
            assert.equal(t_bold.id, "**");
        },
        "can create a string token with a value": function(parser) {
            var t_string = parser.get_token(s("HELLOSKI"));
            assert.equal(t_string.id, "(string)");
            assert.equal(t_string.value, "HELLOSKI");
        }
    },
    "A token stream": {
        topic: parser,
        
        "can set a stream of tokens": function(parser) {
            assert.isFunction(parser.token_stream.set);
            parser.token_stream.set(ts_inline);
        },
        "where the first token is a string": function(parser) {
            var tok = parser.advance();
            assert.equal(tok.id, "(string)");
        },
        "where the second token is a bold token": function(parser) {
            var tok = parser.advance("(string)");
            assert.equal(tok.id, "**");
        },
        "where advancing to the end yields an (end) token": function(parser) {
            parser.advance();
            parser.advance();
            parser.advance();
            var tok = parser.advance();
            assert.equal(tok.id, "(end)");
        }
    },
    "Another token stream": {
        topic: function() {
            return parser.token_stream;
        },
        "can set a stream of tokens": function(token_stream) {
            token_stream.set(ts_simple);
            assert.equal(token_stream.line, 0);
            assert.equal(token_stream.tokens.length, 2);
        },
        "has a first line containing an indent and string token": function(token_stream) {
            assert.deepEqual(token_stream.next(), {id: "(indent)", value: 0});
            assert.deepEqual(token_stream.next(), {id: "(string)", value: "Foo and bar"});
        },
        "has a second line containing an indent and another string token": function(token_stream) {
            assert.deepEqual(token_stream.next(), {id: "(indent)", value: 0});
            assert.deepEqual(token_stream.next(), {id: "(string)", value: "Baz and zot"});
        }
    }
}).addBatch({
    /*
    "A paragraph document tree": {
        topic: function() {
            parser.token_stream.set([ts_paragraph]);
            parser.advance();
            return parser.parse();
        },
        "starts with a paragraph": function(tree) {
            assert.equal(tree.id, "paragraph");
            assert.equal(tree.value, "paragraph");
        },
        "which has three children": function(tree) {
            assert.length(tree.children, 3);
        },
        "where the first child is text": function(tree) {
            assert.equal(tree.children[0].id, "(string)");
            assert.equal(tree.children[0].value, "This is ");
        },
        "where the second child is bold": function(tree) {
            assert.equal(tree.children[1].id, "**");
            assert.equal(tree.children[1].value, "**");
            assert.equal(tree.children[1].children[0].id, "(string)");
            assert.equal(tree.children[1].children[0].value, "bold");
        },
        "where the third child is text": function(tree) {
            assert.equal(tree.children[2].id, "(string)");
            assert.equal(tree.children[2].value, " text.");
        },
    }*/
}).export(module);