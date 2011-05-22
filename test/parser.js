var vows = require("vows"),
    assert = require("assert"),
    YUI = require("yui3").YUI,
    parser = require("../lib/parser.js");

var Y = YUI({debug: false}).useSync("node");

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
var ts_simple = [[ind(0), s("Foo and bar")],[ind(2)],[ind(0), s("Baz and zot")]];

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
        "can get a bogus token once it is defined as a symbol": function(parser) {
            var t_bogus = parser.get_token(tok("(bogus)"));
            assert.equal(t_bogus.id, "(bogus)");
            assert.equal(t_bogus.template, "<span/>");
            assert.isFunction(t_bogus.parse);
            assert.equal(t_bogus.transition, undefined);
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
        "can set a stream of tokens with three lines": function(token_stream) {
            token_stream.set(ts_simple);
            assert.equal(token_stream.line, 0);
            assert.equal(token_stream.tokens.length, 3);
        },
        "peeking ahead finds an indent token": function(token_stream) {
            assert.deepEqual(token_stream.peek(), ind(0));
        },
        "has a first line containing an indent and string token": function(token_stream) {
            assert.deepEqual(token_stream.next(), ind(0));
            assert.deepEqual(token_stream.next(), s("Foo and bar"));
        },
        "peeking ahead finds another indent token": function(token_stream) {
            assert.deepEqual(token_stream.peek(), ind(2));
        },
        "has a second line that contains only a single indent token": function(token_stream) {
            assert.deepEqual(token_stream.next(), ind(2));
        },
        "has a third line containing an indent and another string token": function(token_stream) {
            assert.deepEqual(token_stream.next(), ind(0));
            assert.deepEqual(token_stream.next(), s("Baz and zot"));
        },
        "peeking ahead finds an (end) token": function(token_stream) {
            assert.equal((token_stream.peek()).id, "(end)");
        },
        "after that, continues to return (end) tokens": function(token_stream) {
            assert.equal((token_stream.next()).id, "(end)");
            assert.equal((token_stream.next()).id, "(end)");
        }
    },
    // possibly bogus -- I think we need this.transition(), not a general one
    "The transition() function": {
        topic: parser,
        
        "For a non-indent token, returns the same token back": function(parser) {
            var t;
            parser.token_stream.set([[s("a"), s("b")]]);
            t = parser.advance();
            parser.advance();
            t = parser.transition(t);
            assert.equal(t.id, "(string)");
            assert.equal(t.value, "a");
        },
        "For an indent token followed by a string, returns a paragraph": function(parser) {
            var t;
            parser.token_stream.set([[ind(0), s("b")]]);
            t = parser.advance();
            parser.advance();
            t = parser.transition(t);
            assert.equal(t.id, "paragraph");
        }
    },
    "The make_node() function": {
        topic: parser,
        
        "When given a string token, returns a very lightweight object": function(parser) {
            var node = parser.make_node(parser.get_token(s("aaa")));
            assert.equal(node.parse(), "aaa");
        },
        "When given a paragraph token, returns an empty Y.Node p": function(parser) {
            var node = parser.make_node(parser.get_token(tok("paragraph")));
            assert.equal(node.get("nodeName"), "P");
            assert.equal(node.getContent(), "");
        },
        "When given an indent token, returns an empty Y.Node span": function(parser) {
            var node = parser.make_node(parser.get_token(ind(4)));
            assert.equal(node.get("nodeName"), "SPAN");
            assert.isTrue(node.hasClass("indent"));
            assert.equal(node.getContent(), "");
            assert.equal(node.getData("indent"), 4);
        },
    },
    "A paragraph can parse token streams": {
        topic: parser, 
        
        "For an empty stream, a paragraph has no children": function(parser) {
            var node = parser.make_node(parser.get_token({id: "paragraph"}));
            parser.token_stream.set([[tok("(end)")]]);
            node.parse();
            assert.equal(node.get("children").size(), 0);
            assert.equal(node.getContent(), "");
        },
        "For a stream of IND,STR, a paragraph contains a single string": function(parser) {
            var node = parser.make_node(parser.get_token({id: "paragraph"}));
            parser.token_stream.set([[ind(0), s("Foo bar")]]);
            node.parse();
            assert.equal(node.getContent(), "Foo bar");
        },
        "For a stream of IND,STR,IND,STR, a paragraph contains a single string": function(parser) {
            var node = parser.make_node(parser.get_token({id: "paragraph"}));
            parser.token_stream.set([[ind(0), s("Foo bar")], [ind(0), s("Baz zorp")]]);
            node.parse();
            assert.equal(node.getContent(), "Foo barBaz zorp");
        },
        "For a stream of IND,STR,IND,IND,STR, the paragraph contains just the first string": function(parser) {
            var node = parser.make_node(parser.get_token({id: "paragraph"}));
            parser.token_stream.set([[ind(0), s("Foo bar")], [ind(0)], [ind(0), s("Baz zorp")]]);
            node.parse();
            assert.equal(node.getContent(), "Foo bar");
        }
    }
}).export(module);