﻿module TextRight {
  /**
   * Contains the representation of each line that is parsed
   */
  export class ParsedLine {
    /**
     * @param type the type of block that was parsed
     * @param data the data associated with the block
     */
    constructor(public type: ParsedLineType, public data: any) {
    }

    /**
     * Create a block that represents a block of all whitespace
     */
    public static createEmpty(line: Line): ParsedLine {
      return new ParsedLine(ParsedLineType.Blank, {
        content: line.getLineFragment()
      });
    }

    /**
     * Create a block that represents a line that consists of plain text
     */
    public static createText(line: Line): ParsedLine {
      return new ParsedLine(ParsedLineType.Text, {
        content: line.getLineFragment()
      });
    }
  }

  /**
  * Indicates the type of block that a line represents
  */
  export enum ParsedLineType {
    Heading,
    Style,
    Quote,
    Blank,
    Text,
    TextContinuation,
    UnorderedListItem,
    OrderedListItem,
    ListItemContinuation,
    XmlTagStart,
    XmlContinuation,
    XmlTagEnd,
  }

  /** A line which contains data.  All I_Line interfaces should actually have content.*/
  export interface IContentLine {
    content: LineFragment;
  }

  /**
   * State used when parsing lines.
   */
  export class LineParserState {
    public subState: LineParserState;
    public continuationMode: LineParserStateContinuationMode;
    public lastLineWasBlank: boolean;
    public openXmlTag: string;
    /** The amount of space needed to continue a list item */
    public listContinuationSpace: number;

    constructor() {
      this.subState = null;
      this.continuationMode = LineParserStateContinuationMode.None;
      this.lastLineWasBlank = true;
      this.listContinuationSpace = 0;
    }
  }

  function isEmpty(line: string) {
    return line.match(/^[ \t]*$/);
  }

  /**
   * Determines how the next line should be parsed
   */
  export enum LineParserStateContinuationMode {
    /* Normally */
    None,
    /* As a list item, if possible*/
    List,
    /* As text, if possible */
    Text,
    /* As xml, if possible */
    Xml,
  }

  /** A block that looks like '## This is a header' */
  export interface IHeadingLine {
    /* The location where the '#' starts */
    prefix: LineFragment;

    /* The spacing between '#' and the text-content */
    prefixContentWhitespace: LineFragment;

    /* The textual content of the header */
    content: LineFragment;
  }

  /** Parse a line into a header, or return null */
  function parseBlockHeader(line: Line): ParsedLine {
    var matcher = new RegexMatchIterator();

    if (!matcher.tryMatch(/^(#+)([ \t]*)(.*)$/, line.text, line))
      return null;

    var data: IHeadingLine = {
      prefix: matcher.nextPosition(),
      prefixContentWhitespace: matcher.nextPosition(),
      content: matcher.nextPosition(),
    };

    return new ParsedLine(ParsedLineType.Heading, data);
  }

  /** A line which provides a style for the next line/block */
  export interface IStyleLine {
    /* The location where the "'''" starts */
    prefix: LineFragment;
    /* The spacing before the style prefix and the style-content */
    prefixContentWhitespace: LineFragment;
    /* The textual content of the style */
    content: LineFragment;
    /* The spacing before the style prefix and the style-content */
    contentPrefixWhitespace: LineFragment;
    /* The location where the "'''" starts */
    postfix: LineFragment;
  }

  /** Convert a line into a style line */
  function parseBlockStyle(line: Line): ParsedLine {
    var matcher = new RegexMatchIterator();

    if (!matcher.tryMatch(/^(---)([ \t]*)(.*)([ \t]*)(---)$/, line.text, line))
      return null;

    var data: IStyleLine = {
      prefix: matcher.nextPosition(),
      prefixContentWhitespace: matcher.nextPosition(),
      content: matcher.nextPosition(),
      contentPrefixWhitespace: matcher.nextPosition(),
      postfix: matcher.nextPosition()
    };

    return new ParsedLine(ParsedLineType.Style, data);
  }

  /** A line which begins a quote */
  export interface IQuoteLine {
    /* The location before the quote */
    prefixWhitespace: LineFragment;
    /* The quote character */
    prefix: LineFragment;
    /* The textual content of the quote */
    content: LineFragment;
  }

  /** Convert a line into a block quote line */
  function parseBlockQuote(line: Line): ParsedLine {
    var matcher = new RegexMatchIterator();

    if (!matcher.tryMatch(/^( ?)(>)( ?)(.*)$/, line.text, line))
      return null;

    var data: IQuoteLine = {
      prefixWhitespace: matcher.nextPosition(),
      prefix: matcher.nextPosition(),
      content: matcher.nextPosition()
    };

    return new ParsedLine(ParsedLineType.Quote, data);
  }

  /** A line which represents the start of an unordered list item */
  export interface IUnorderdListItemLine {
    /* The location before the list */
    prefixWhitespace: LineFragment;
    /* The list character */
    prefix: LineFragment;
    /* The space before the start of the list */
    prefixContentWhitespace: LineFragment;
    /* The textual content of the list item */
    content: LineFragment;
  }

  /** A line which represents the start of an numeric/ordered list item */
  export interface IOrderedListItemLine extends IUnorderdListItemLine {
    /** The symbol used to separate the prefix from the whitespace */
    listPeriod: LineFragment;
  }

  /** Convert a line into either an IUnorderdListItemLine or IOrderedListItemLine */
  function parseBlockListStart(line: Line, state: LineParserState): ParsedLine {
    var matcher = new RegexMatchIterator();

    if (matcher.tryMatch(/^( ?)([\-\*\+])( )(.*)$/, line.text, line)) {
      var ulData: IUnorderdListItemLine = {
        prefixWhitespace: matcher.nextPosition(),
        prefix: matcher.nextPosition(),
        prefixContentWhitespace: matcher.nextPosition(),
        content: matcher.nextPosition(),
      };

      state.lastLineWasBlank = false;
      // TODO currently this spacing is off.  It needs to be discussed how much you
      // must indent the next line.  It should take into account what all of
      // the following mean:
      // 100. Item 1
      //   1. Item 2?
      //    1. Another list?
      //     1. How about now?
      //        1. Or now?
      //    1. And what should this be?
      //  1. or this?
      state.listContinuationSpace = ulData.prefixWhitespace.length
      + ulData.prefixContentWhitespace.length;
      state.continuationMode = LineParserStateContinuationMode.List;

      return new ParsedLine(ParsedLineType.UnorderedListItem, ulData);
    } else if (line.text[0] === ' '
      && matcher.tryMatch(/^( ?)([0-9]+|#)(\.)( )(.*)$/, line.text, line)) {
      var olData: IOrderedListItemLine = {
        prefixWhitespace: matcher.nextPosition(),
        prefix: matcher.nextPosition(),
        listPeriod: matcher.nextPosition(),
        prefixContentWhitespace: matcher.nextPosition(),
        content: matcher.nextPosition(),
      };

      state.lastLineWasBlank = false;
      state.listContinuationSpace = olData.prefixWhitespace.length
      + olData.prefixContentWhitespace.length;
      state.continuationMode = LineParserStateContinuationMode.List;

      return new ParsedLine(ParsedLineType.OrderedListItem, olData);
    } else {
      return null;
    }
  }

  /** A continuation of a list item */
  export interface IListItemContinuationLine  {
    /** The prefix leading up to the content */
    contentWhitespace: LineFragment;
    /* The textual content of the list item */
    content: LineFragment;
  }

  /** Parse a line into an IListItemContinuationLine */
  function parseListBlockContinuation(line: Line, state: LineParserState): ParsedLine {
    var isLineEmpty = isEmpty(line.text);

    if (isLineEmpty && state.lastLineWasBlank) {
      // end of list
      return null;
    } else if (isLineEmpty) {
      state.lastLineWasBlank = true;

      return ParsedLine.createEmpty(line);
    } else if (line.text.length > state.listContinuationSpace + 1) {
      var prefix = line.text.substr(0, state.listContinuationSpace + 1);
      if (isEmpty(prefix)) {
        var data: IListItemContinuationLine = {
          contentWhitespace: line.getFragment(0, prefix.length),
          content: line.getFragmentToEnd(prefix.length)
        };

        return new ParsedLine(ParsedLineType.ListItemContinuation, data);
      }
    }

    // end of this list
    return null;
  }

  /** Parse a line into a text block continued from the previous line*/
  function parseBlockTextContinuation(line: Line, state: LineParserState): ParsedLine {
    if (isEmpty(line.text)) {
      state.continuationMode = LineParserStateContinuationMode.None;
      state.lastLineWasBlank = true;
      return ParsedLine.createEmpty(line);
    } else {
      state.continuationMode = LineParserStateContinuationMode.Text;
      state.lastLineWasBlank = false;
      return ParsedLine.createText(line);
    }
  }

  /** A line which represents the start of an xml block */
  export interface IXmlStartTagLine  {
    /* The content of the xml line */
    content: LineFragment;

    /* The tag used to create the tag */
    tagName: LineFragment;
  }

  /** Represents the start of an xml block. TODO start using instead of IXmlStartTagLine */
  export interface IXmlData {
    content: LineFragment
    tagStart: LineFragment;
    tagName: LineFragment;
    attributeData: LineFragment;
    postAttributeSpace: LineFragment;
    tagEnd: LineFragment;
  }

  /** Convert a line into a xml start tag*/
  function parseBlockXmlStart(line: Line, state: LineParserState): ParsedLine {
    var matcher = new RegexMatchIterator();

    // TODO parse attributes
    if (!matcher.tryMatch(/^(<)([a-z\+]*)(.*?)([ \t]*)(>)$/i, line.text, line)) {
      return null;
    }

    var fakeData: IXmlData = {
      tagStart: matcher.nextPosition(),
      tagName: matcher.nextPosition(),
      attributeData: matcher.nextPosition(),
      postAttributeSpace: matcher.nextPosition(),
      tagEnd: matcher.nextPosition(),
      content: null,
    };

    state.openXmlTag = fakeData.tagStart.getText();
    state.continuationMode = LineParserStateContinuationMode.Xml;

    var data: IXmlStartTagLine = {
      content: line.getLineFragment(),
      tagName: fakeData.tagName
    };

    return new ParsedLine(ParsedLineType.XmlTagStart, data);
  }

  /** A line which represents the closing tag of an xml block */
  export interface IXmlEndTagLine  {
    /* Should always be '</' */
    prefix: LineFragment;
    /* The tag that closed the xml block*/
    tagName: LineFragment;
    /* The whitespace between the tagName and the postfix */
    tagNamePostfixWhitespace: LineFragment;
    /* Should always be '>' */
    postfix: LineFragment;
    /* The whitespace found at the end of the line past the postfix*/
    eolWhitespace: LineFragment;

    /* The entire line parsed */
    content: LineFragment;
  }

  /** Parse a line into the end of a xml block */
  function parseXmlBlockContinuation(line: Line, state: LineParserState): ParsedLine {
    var matcher = new RegexMatchIterator();

    if (!matcher.tryMatch(/^(<\/)([a-z\-]+)([ \t]*)(>)([ \t]*)$/i, line.text, line)) {
      var textContent: IContentLine = {
        content: line.getLineFragment(),
      };

      state.continuationMode = LineParserStateContinuationMode.Xml;

      return new ParsedLine(ParsedLineType.XmlContinuation, textContent);
    }

    var data: IXmlEndTagLine = {
      prefix: matcher.nextPosition(),
      tagName: matcher.nextPosition(),
      tagNamePostfixWhitespace: matcher.nextPosition(),
      postfix: matcher.nextPosition(),
      eolWhitespace: matcher.nextPosition(),
      content: line.getLineFragment(),
    };

    state.continuationMode = LineParserStateContinuationMode.None;
    state.openXmlTag = null;

    return new ParsedLine(ParsedLineType.XmlTagEnd, data);
  }

  /** Parse a single line into node. */
  function parseLine(line: Line, state: LineParserState, options: Options): ParsedLine {
    var block: ParsedLine;

    if (state.continuationMode === LineParserStateContinuationMode.Text) {
      if (line[0] == ' ' && options.disallowSimpleParagraphs !== true) {
        var startOfList = parseBlockListStart(line, state);
        if (startOfList !== null) {
          return startOfList;
        }
      }

      return parseBlockTextContinuation(line, state);
    } else if (state.continuationMode == LineParserStateContinuationMode.Xml) {
      return parseXmlBlockContinuation(line, state);
    } else if (state.continuationMode === LineParserStateContinuationMode.List) {
      var result = parseListBlockContinuation(line, state);
      if (result !== null) {
        return result;
      }
    }

    if ((block = parseBlockHeader(line)) !== null) {
      state.lastLineWasBlank = false;
      return block;
    }

    if ((block = parseBlockStyle(line)) !== null) {
      state.lastLineWasBlank = false;
      return block;
    }

    if ((block = parseBlockQuote(line)) !== null) {
      state.lastLineWasBlank = false;
      return block;
    }

    if ((block = parseBlockListStart(line, state)) !== null) {
      state.lastLineWasBlank = false;
      return block;
    }

    if ((block = parseBlockXmlStart(line, state)) !== null) {
      state.lastLineWasBlank = false;
      return block;
    }

    if (isEmpty(line.text)) {
      state.lastLineWasBlank = true;
      return ParsedLine.createEmpty(line);
    }

    state.lastLineWasBlank = false;
    state.continuationMode = LineParserStateContinuationMode.Text;
    return ParsedLine.createText(line);
  }

  /** Parses lines into various line data blocks. */
  export class LineParser {
    constructor(private options: Options = new Options()) {
    }

    /** Parse a series of lines into line nodes. */
    public parse(lines: Line[]): ParsedLine[] {
      var state = new LineParserState();
      return lines.map(l => this.parseLine(l, state));
    }

    /** Parse a single line into a series of ParsedLine */
    public parseLine(line: Line, state: LineParserState): ParsedLine {
      return parseLine(line, state, this.options);
    }
  }
}