# Introduction #

**TextRight** is a plain text formatting syntax inspired by Markdown and its variants.

## Goals ##

TextRight has three primary goals:

### 1. Easily Parsable

TextRight should be able to be parsed top-down, line-by-line without looking at the next line to identify the type of block that a line represents.  This means:

 - No setext headers are allowed, as it requires knowledge that the next line underlines the current line.  
 - Each line can be parsed only with the knowledge of the previous line's state.

By keeping the language easily parsable, porting the reference implementation to other languages should be fairly simple.

### 2. Look Good as Text

Text formatted with TextRight identifiers should look like what it is representing, and should not contain markup with the intention of styling the content in rendered form.  For example, formatting the title of a page with an open and close tag doesn't make much sense in plain text:

```
#!text
# {Title}The title of the page{/Title}
```
but applying a tag/style to a block does look fairly normal:

```
#!text
--- primary ---
# The Title of the Page
```

## What is this repository for? ##

This repository holds the reference implementation of a TextRight parser.  It is implemented in Typescript, with various test files containing expected output from designated input.