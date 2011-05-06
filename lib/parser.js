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
        // TODO: change to a while(), concatenate string tokens?
        if (tok.id === "(string)") {
            var t = Object.create(symbol_table.table[tok.id]);
            t.value = tok.value;
            return t;
        }
        else {            
            return symbol_table.table[tok.id];
        }
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

function parse() {
    var t = token;
    advance();
    t = transition(t);
    return t.nud();
}

/*
 (start)
 (indent 0) (string)
 (indent 0) (string)
 (indent 0)
 (indent 0) (string)
 (end)
 0. advance() into the document (start)
   - token = (start)
 1. parse()
    a) t = (start)
    b) advance() 
        - token = (indent 0)
    c) return t.nud() = (start).nud()

    Therefore, 
        t cannot be a (start)
        t must be a paragraph
        in paragraph.nud() we start with the current token as the first indent token
        -> self.indent = token.value
    when transitioning into start, we need to look ahead and spawn a paragraph token
        transitioning requires peeking ahead at a full line
        is the line just an (indent 0)? an (indent 0) (string)? an (indent 0) + something that -> a bulleted list?
        transition occurs when advancing to an (indent)?
         = indent means:
            peek ahead one token on that line.
            Are we a blank line? 
    in parse()
        t = token
        advance --> token is one ahead
        t = (string that ends the line)
        token is the next indent
        
        so we want:
        
        function parse() {
            var t = token;      // t = (string at the end of a line, or a (start) token)
            advance();          // token = (an indent)
            t = transition(t)   // use t and token to determine whether to continue para, or start a new one?
                                // not enough info -- we need the indent and the next token after that.
            return t.nud()
        }
        
        function parse() {
            var t = token;      // t = an indent token
            advance();          // token = a string token, or another indent token, or ...  

            return t.nud()      // we are a paragraph.
                                    subsequently, check the indent level against subsequent lines.
                                    This implies paragraphs need to know how to end themselves?
                                        if so, is_next_line_empty() is *not* helpful
                                        when do I call if_next_line_empty? I don't know because all I have is token_stream.next(). 
                                    
        }
        
        
        

        
        Side issue, need to figure out what happens to inline tokens across line boundaries
        and handle paragraphs ending
*/

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




// - What is a paragraph? 
//   - it is a type of body element
//   - in general body elements may contain other body elements, but paragraphs only contain inlines & strings
//   - starts with a newline (except at the beginning of a doc)
//   - may contain newlines, strings, and inlines
//   - ends with a double newline
//   - must maintain the same indent level throughout
function body_element(id, nud) {
    var s = symbol(id);
    s.indent = 0; // FAKE, this should be set when mutating the paragraph in the transition() function
    var a = [];
    s.nud = nud || function() {
        // assume we are at a newline?
        this.indent = token.value;
        while(! is_next_line_empty()) {
            
        }
        /*
        if (token.id !== "\n\n") {
            while(true) {
                a.push(parse());
                if (token.id === "\n\n" || token.id === "(end)") {
                    break;
                }
            }
        }
        this.children = a;
        return this;*/
    }
}

/*
(start)
(indent 0) (string)
(indent 0) (string)
(indent 0)
(indent 0) (string)
(end)
// start state: t = paragraph (was an indent), token = a string or inline or (some such).
paragraph.nud = function() {
    while(true) {
        if token is (end)
            break
        if token is an indent 
            if the indent level is wrong              // malformed para
                throw an error
            else if the NEXT token is also an indent  // token is a blank line --> para is over
                // possibly advance first, then break?
                then break;
            else 
                advance();
        a.push(parse()) // this is now handling strings and inlines
    }
    this.children = a
    return this;
}
*/


// compound body elements: local substructure (body subelements) and body elements, but no text data.
// - admonition, attention, block_quote, bullet_list, caution, citation, compound, 
//   container, danger, definition_list, enumerated_list, error, field_list, figure, 
//   footnote, hint, important, line_block, note, option_list, system_message, table, tip, warning

// What do simple body elements have in common? 
//   to implement: comment, doctest_block, image, literal_block, paragraph, substitution_definition, target
//   no implement: pending, raw, rubric
// - they are empty or contain text data directly
// - they are separated by empty lines. When the next line is empty, stop.
// - because they do not generate child body elements, they do not need intelligence about containing other body elements
// - need the ability to peek ahead at next line? 

// What does a paragraph need?
// - need the ability to tell if next line is empty
// - nud() would be:
//      set the indent level 
//      while next line is not empty
//          check indent level -- throw an error if it
//          parse inline tokens and push them to the children array

// Need to augment advance() with intelligence about (indent)

exports.prefix = prefix;
exports.symbol = symbol;
exports.get_token = symbol_table.get_token;
exports.advance = advance;
exports.parse = parse;
exports.body_element = body_element;
exports.token_stream = token_stream;
exports.transition = transition;

symbol("(string)");
symbol("(end)");
symbol("(indent)");
inline("**");
body_element("paragraph");
