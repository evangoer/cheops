var token = null;

var token_stream = {
    tokens: [[]],
    line: 0,
    the_end_is_near: function() {
        if (this.line >= this.tokens.length) {
            return true;
        }
        if (this.tokens[this.line].length <= 0) {
            this.line += 1;
            return this.the_end_is_near();
        }
        return false;
    },
    next: function() {
        if (this.the_end_is_near()) {
            return symbol_table.get_token({id: "(end)"});
        }
        else {
            return this.tokens[this.line].shift();
        }
    },
    peek: function() {
        if (this.the_end_is_near()) {
            return symbol_table.get_token({id: "(end)"});
        }
        else {
            return this.tokens[this.line][0];
        }
    },
    set: function(ts) {
        this.tokens = ts;
        this.line = 0;
        token = null; // side effect
    }
};

var symbol_table = {
    table: {},
    define: function(sym) {
        symbol_table.table[sym.id] = sym;
    },
    get_token: function(tok) {
        var t;
        // TODO: change to a while(), concatenate string tokens?
        if (tok.id === "(string)") {
            t = Object.create(symbol_table.table[tok.id]);
            t.value = tok.value;
            return t;
        }

        return symbol_table.table[tok.id];
    }
}

function advance(id) {
    if (id && token.id !== id) {            
        throw new Error("Expected token " + id);
    }
    else {
        var t = token_stream.next();
        token = symbol_table.get_token(t);
        if (token === undefined) {
            throw new Error("Symbol '" + t.id + "' never defined in the symbol table.");
        }
    }
    return token;
}

// NOTE 14-May-2011: I think transition is specific to a particular node now.
// For example, section.transition() or document.transition() figures out that
// a new paragraph has started. paragraph.transition() figures out that the 
// paragraph has ended, and throws control back to the document or section. 
// So not sure that this global transition function is needed anymore.
//
// Determines transitions for body/block elements, mutating
// indent tokens into paragraphs, numbered lists, etc. as necessary.
function transition(t) {
    //Since we are an indent token, set indent level in the transition().
    //t = transition(t)   // use t and token and t.value (indent level) to determine what we are
    //                        if token is a string token, mutate to paragraph
    //                        if token is a number token, mutate to numbered list
    //                        if token is an indent, skip, ...
    var element;
    if (t.id !== "(indent)") {
        return t;
    }
    if (token.id === "(string)") {
        element = symbol_table.get_token({id:"paragraph"});
    }
    element.indent = t.value;
    return element;
}

function symbol(id) {
    var s = {};
    s.id = s.value = id;
    s.nud = function() { return this };
    symbol_table.define(s);
    return s;
}

// use for bullets & other things? 
// currently untested and unused
function prefix(id, nud) {
    var s = symbol(id);
    s.children = [];
    s.nud = nud || function () {
        this.children[0] = parse();
        return this;
    };
    return s;
}

// need to account for inlines that contain inline fragments, i.e. **there is `` some bold** 
// - mutate the `` back into a string. But handle this later.
function inline(id, nud) {
    var s = symbol(id);
    s.children = [];
    s.nud = nud || function () {
        this.children[0] = parse();
        advance(id);
        return this;
    };
    return s;
}

function body_element(id, nud) {
    var s = symbol(id);
    s.indent = 0; // FAKE, this should be set from an (indent) token
    var a = [];
    s.nud = nud || function() {
        var t;
        while((advance()).id !== "(end)") {
            t = token;
            if (t.id === "(indent)") {
                t = this.transition();
                if (t === null) {
                    break;
                }
            }
            a.push(t.nud());
        }
        this.children = a;
        return this;
    }
    s.transition = function() {
        // Not sure if we should simply advance in both cases or not. If so: 
        //   var t = advance();
        //   return t.id === "(indent)" ? null : t;
        // Also check the indent level, throw an error if something has gone wrong.
        var t = token_stream.peek();
        if (t.id === "(indent)") {
            return null;
        }
        else {
            return advance();
        }
    }
}

// compound body elements: local substructure (body subelements) and body elements, but no text data.
// - admonition, attention, block_quote, bullet_list, caution, citation, compound, 
//   container, danger, definition_list, enumerated_list, error, field_list, figure, 
//   footnote, hint, important, line_block, note, option_list, system_message, table, tip, warning

// simple body elements: empty or contain text data directly, but no child body elements
//   to implement: comment, doctest_block, image, literal_block, paragraph, substitution_definition, target
//   no implement: pending, raw, rubric
// - they are separated by empty lines. When the next line is empty, stop.
// - because they do not generate child body elements, they do not need intelligence about containing other body elements
// - need the ability to peek ahead at next line? 

exports.prefix = prefix;
exports.symbol = symbol;
exports.get_token = symbol_table.get_token;
exports.advance = advance;
exports.body_element = body_element;
exports.token_stream = token_stream;
exports.transition = transition; // possibly not needed

symbol("(string)");
symbol("(end)");
symbol("(indent)");
inline("**");
body_element("paragraph");
