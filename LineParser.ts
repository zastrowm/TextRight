module TextRight {
  /**
    * Represents a single line of text that needs to be parsed.
    */
  export class Line {
    /**
     * @param line the index of the line that the text represents.
     * @param text the actual text for the line.
     */
    constructor(public index: number, public text: string) {
    }
  }

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
        content: new TextAndPosition(0, line.text, line)
      });
    }

    /**
     * Create a block that represents a line that consists of plain text
     */
    public static createText(line: Line): ParsedLine {
      return new ParsedLine(ParsedLineType.Text, {
        content: new TextAndPosition(0, line.text, line)
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
    HtmlTagStart,
    HtmlContinuation,
    HtmlTagEnd,
  }

  /** A line which contains data.  All I_Line interfaces should actually have content.*/
  export interface IContentLine {
    content: TextAndPosition;
  }

  /**
   * State used when parsing lines.
   */
  export class LineParserState {
    public subState: LineParserState;
    public continuationMode: LineParserStateContinuationMode;
    public lastLineWasBlank: boolean;
    public openHtmlTag: string;
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
    /* As html, if possible */
    Html,
  }

  /** A block that looks like '## This is a header' */
  export interface IHeaderLine {
    /* The location where the '#' starts */
    prefix: TextAndPosition;

    /* The spacing between '#' and the text-content */
    prefixContentWhitespace: TextAndPosition;

    /* The textual content of the header */
    content: TextAndPosition;
  }

  /** Parse a line into a header, or return null */
  function parseBlockHeader(line: Line): ParsedLine {
    var matcher = new RegexMatchIterator();

    if (!matcher.tryMatch(/^(#+)([ \t]*)(.*)$/, line.text, line))
      return null;

    var data: IHeaderLine = {
      prefix: matcher.nextPosition(),
      prefixContentWhitespace: matcher.nextPosition(),
      content: matcher.nextPosition(),
    };

    return new ParsedLine(ParsedLineType.Heading, data);
  }

  /** A line which provides a style for the next line/block */
  export interface IStyleLine {
    /* The location where the "'''" starts */
    prefix: TextAndPosition;
    /* The spacing before the style prefix and the style-content */
    prefixContentWhitespace: TextAndPosition;
    /* The textual content of the style */
    content: TextAndPosition;
    /* The spacing before the style prefix and the style-content */
    contentPrefixWhitespace: TextAndPosition;
    /* The location where the "'''" starts */
    postfix: TextAndPosition;
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
    prefixWhitespace: TextAndPosition;
    /* The quote character */
    prefix: TextAndPosition;
    /* The textual content of the quote */
    content: TextAndPosition;
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
    prefixWhitespace: TextAndPosition;
    /* The list character */
    prefix: TextAndPosition;
    /* The space before the start of the list */
    prefixContentWhitespace: TextAndPosition;
    /* The textual content of the list item */
    content: TextAndPosition;
  }

  /** A line which represents the start of an numeric/ordered list item */
  export interface IOrderedListItemLine extends IUnorderdListItemLine {
    /** The symbol used to separate the prefix from the whitespace */
    listPeriod: TextAndPosition;
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
    contentWhitespace: TextAndPosition;
    /* The textual content of the list item */
    content: TextAndPosition;
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
          contentWhitespace: new TextAndPosition(0, prefix, line),
          content: new TextAndPosition(
            prefix.length,
            line.text.substr(prefix.length),
            line)
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

  /** A line which represents the start of a html */
  export interface IHtmlStartTagLine  {
    /* The content of the html line */
    content: TextAndPosition;

    /* The tag used to create the tag */
    tagName: TextAndPosition;
  }

  /** Represents the start of an html block. TODO start using instead of IHtmlStartTagLine */
  export interface IHtmlData{
    content: TextAndPosition
    tagStart: TextAndPosition;
    tagName: TextAndPosition;
    attributeData: TextAndPosition;
    postAttributeSpace: TextAndPosition;
    tagEnd: TextAndPosition;
  }

  /** Convert a line into a html start tag*/
  function parseBlockHtmlStart(line: Line, state: LineParserState): ParsedLine {
    var matcher = new RegexMatchIterator();

    // TODO parse attributes
    if (!matcher.tryMatch(/^(<)([a-z\+]*)(.*?)([ \t]*)(>)$/i, line.text, line)) {
      return null;
    }

    var fakeData: IHtmlData = {
      tagStart: matcher.nextPosition(),
      tagName: matcher.nextPosition(),
      attributeData: matcher.nextPosition(),
      postAttributeSpace: matcher.nextPosition(),
      tagEnd: matcher.nextPosition(),
      content: null,
    };

    state.openHtmlTag = fakeData.tagStart.text;
    state.continuationMode = LineParserStateContinuationMode.Html;

    var data: IHtmlStartTagLine = {
      content: new TextAndPosition(0, line.text, line),
      tagName: fakeData.tagName
    };

    return new ParsedLine(ParsedLineType.HtmlTagStart, data);
  }

  /** A line which represents the closing tag of an html block */
  export interface IHtmlEndTagLine  {
    /* Should always be '</' */
    prefix: TextAndPosition;
    /* The tag that closed the html block*/
    tagName: TextAndPosition;
    /* The whitespace between the tagName and the postfix */
    tagNamePostfixWhitespace: TextAndPosition;
    /* Should always be '>' */
    postfix: TextAndPosition;
    /* The whitespace found at the end of the line past the postfix*/
    eolWhitespace: TextAndPosition;

    /* The entire line parsed */
    content: TextAndPosition;
  }

  /** Parse a line into the end of a html block */
  function parseHtmlBlockContinuation(line: Line, state: LineParserState): ParsedLine {
    var matcher = new RegexMatchIterator();

    if (!matcher.tryMatch(/^(<\/)([a-z\-]+)([ \t]*)(>)([ \t]*)$/i, line.text, line)) {
      var textContent: IContentLine = {
        content: new TextAndPosition(0, line.text, line)
      };

      state.continuationMode = LineParserStateContinuationMode.Html;

      return new ParsedLine(ParsedLineType.HtmlContinuation, textContent);
    }

    var data: IHtmlEndTagLine = {
      prefix: matcher.nextPosition(),
      tagName: matcher.nextPosition(),
      tagNamePostfixWhitespace: matcher.nextPosition(),
      postfix: matcher.nextPosition(),
      eolWhitespace: matcher.nextPosition(),
      content: new TextAndPosition(0, line.text, line),
    };

    state.continuationMode = LineParserStateContinuationMode.None;
    state.openHtmlTag = null;

    return new ParsedLine(ParsedLineType.HtmlTagEnd, data);
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
    } else if (state.continuationMode == LineParserStateContinuationMode.Html) {
      return parseHtmlBlockContinuation(line, state);
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

    if ((block = parseBlockHtmlStart(line, state)) !== null) {
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