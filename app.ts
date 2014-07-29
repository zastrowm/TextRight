module TextRight {
  /**
   * The state of the current line
   */
  class State {
    public subState: State;
    public continuationMode: StateContinuationMode;
    public lastLineWasBlank: boolean;
    public openHtmlTag: string;
    /** The amount of space needed to continue a list item */
    public listContinuationSpace: number;

    constructor() {
      this.subState = null;
      this.continuationMode = StateContinuationMode.None;
      this.lastLineWasBlank = true;
      this.listContinuationSpace = 0;
    }
  }

  function isEmpty(line) {
    return line.match(/^[ \t]*$/);
  }

  /**
   * Determines how the current
   */
  enum StateContinuationMode {
    None,
    List,
    Text,
    Html,
  }

  /**
   * A block that looks like '## This is a header'
   */
  interface IBlockHeader extends ILineBlockData {
    /* The location where the '#' starts */
    headerPrefix: TextAndPosition;
    /* The spacing between '#' and the text-content */
    headerSpacing: TextAndPosition;
  }

  /** Parse a line into a block header, or return null */
  function parseBlockHeader(line: string): LineBlock {
    var matcher = new RegexMatchIterator();

    if (!matcher.tryMatch(/^(#+)([ \t]*)(.*)$/, line))
      return null;

    var data: IBlockHeader = {
      headerPrefix: matcher.nextPosition(),
      headerSpacing: matcher.nextPosition(),
      content: matcher.nextPosition(),
    };

    return new LineBlock(LineBlockType.Heading, data);
  }

  interface IStyleBlock extends ILineBlockData  {
    /* The location where the "'''" starts */
    stylePrefix: TextAndPosition;
    /* The spacing before the style prefix and the style-content */
    stylePrefixSpacing: TextAndPosition;
    /* The spacing before the style prefix and the style-content */
    stylePostFixSpacing: TextAndPosition;
    /* The location where the "'''" starts */
    stylePostfix: TextAndPosition;
  }

  /**
   * Attempts to parse a style block out of a line
   */
  function parseBlockStyle(line: string): LineBlock {
    var matcher = new RegexMatchIterator();

    if (!matcher.tryMatch(/^(---)([ \t]*)(.*)([ \t]*)(---)$/, line))
      return null;

    var data: IStyleBlock = {
      stylePrefix: matcher.nextPosition(),
      stylePrefixSpacing: matcher.nextPosition(),
      content: matcher.nextPosition(),
      stylePostFixSpacing: matcher.nextPosition(),
      stylePostfix: matcher.nextPosition()
    };

    return new LineBlock(LineBlockType.Style, data);
  }

  interface IBlockQuote extends ILineBlockData  {
    /* The location before the quote */
    quotePrefix: TextAndPosition;
    /* The quote character */
    quoteCharacter: TextAndPosition;
  }

  function parseBlockQuote(line): LineBlock {
    var matcher = new RegexMatchIterator();

    if (!matcher.tryMatch(/^( ?)(>)( ?)(.*)$/, line))
      return null;

    var data: IBlockQuote = {
      quotePrefix: matcher.nextPosition(),
      quoteCharacter: matcher.nextPosition(),
      content: matcher.nextPosition()
    };

    return new LineBlock(LineBlockType.Quote, data);
  }

  interface IBlockUnorderedListStart extends ILineBlockData  {
    /* The location before the list */
    listPrefix: TextAndPosition;
    /* The list character */
    listSymbol: TextAndPosition;
    /* The space before the start of the list */
    listSpace: TextAndPosition;
  }

  interface IBlockOrderedListStart extends IBlockUnorderedListStart {
    /** The position of the text period */
    listPeriod: TextAndPosition;
  }

  function parseBlockListStart(line, state: State): LineBlock {
    var matcher = new RegexMatchIterator();

    if (matcher.tryMatch(/^( ?)([\-\*\+])( )(.*)$/, line)) {
      var ulData: IBlockUnorderedListStart = {
        listPrefix: matcher.nextPosition(),
        listSymbol: matcher.nextPosition(),
        listSpace: matcher.nextPosition(),
        content: matcher.nextPosition(),
      };

      state.lastLineWasBlank = false;
      state.listContinuationSpace = ulData.listPrefix.length
                                    + ulData.listSpace.length;
      state.continuationMode = StateContinuationMode.List;

      return new LineBlock(LineBlockType.UnorderedListItem, ulData);
    } else if (line[0] === ' '
                && matcher.tryMatch(/^( ?)([0-9]+|#)(\.)( )(.*)$/, line)) {
      var olData: IBlockOrderedListStart = {
        listPrefix: matcher.nextPosition(),
        listSymbol: matcher.nextPosition(),
        listPeriod: matcher.nextPosition(),
        listSpace: matcher.nextPosition(),
        content: matcher.nextPosition(),
      };

      state.lastLineWasBlank = false;
      state.listContinuationSpace = olData.listPrefix.length
                                    + olData.listSpace.length;
      state.continuationMode = StateContinuationMode.List;

      return new LineBlock(LineBlockType.OrderedListItem, olData);
    } else {
      return null;
    }
  }

  /** Continuation of a block list item */
  interface IBlockListContinuation extends ILineBlockData  {
    /** The prefix leading up to the content */
    listPrefix: TextAndPosition;
  }

  function parseListBlockContinuation(line: string, state: State): LineBlock {
    var isLineEmpty = isEmpty(line);

    if (isLineEmpty && state.lastLineWasBlank) {
      // end of list
      return null;
    } else if (isLineEmpty) {
      state.lastLineWasBlank = true;

      return LineBlock.createEmpty(line);
    } else if (line.length > state.listContinuationSpace + 1) {
      var prefix = line.substr(0, state.listContinuationSpace + 1);
      if (isEmpty(prefix)) {
        var data: IBlockListContinuation = {
          listPrefix: new TextAndPosition(0, prefix),
          content: new TextAndPosition(prefix.length, line.substr(prefix.length))
        };

        return new LineBlock(LineBlockType.ListItemContinuation, data);
      }
    }

    // end of this list
    return null;
  }

  function parseBlockTextContinuation(line: String, state: State): LineBlock {
    if (isEmpty(line)) {
      state.continuationMode = StateContinuationMode.None;
      state.lastLineWasBlank = true;
      return LineBlock.createEmpty(line);
    } else {
      state.continuationMode = StateContinuationMode.Text;
      state.lastLineWasBlank = false;
      return LineBlock.createText(line);
    }
  }

  interface IBlockHtmlData extends ILineBlockData {
  }

  class LineSearcher {
    private currentPosition: number;
    private end: number;
    private cached: string;
    private line: string;

    constructor(line: string, position: number = 0, end: number = line.length) {
      this.line = line;
      this.currentPosition = position;
      this.end = end;

      this.cache();
    }

    public get isValid() {
      return this.currentPosition < this.end;
    }

    public get current() {
      return this.cached;
    }

    private cache() {
      if (this.isValid) {
        this.cached = this.line[this.currentPosition];
      } else {
        this.cached = null;
      }
    }

    public skipWhitespace(): boolean {
      var consumed = 0;

      while (this.isValid && (this.cached == ' ' || this.cached == '\t')) {
        consumed++;
        this.skip();
      }

      return consumed > 0;
    }

    public read(regex: RegExp): string[]{
      if (!this.isValid) {
        return null;
      }

      var partial = this.line.slice(this.currentPosition, this.end - this.currentPosition);
      var match = partial.match(regex);

      if (match === null) {
        return null;
      }

      this.currentPosition += match[0].length;
      return match;
    }

    public skip(): void {
      if (!this.isValid) {
        return;
      }

      this.currentPosition++;
      this.cache();
    }
  }

  interface IBlockHtmlData extends ILineBlockData {
    tagName: TextAndPosition;
  }

  interface IHtmlData extends ILineBlockData {
    content: TextAndPosition
    tagStart: TextAndPosition;
    tagName: TextAndPosition;
    attributeData: TextAndPosition;
    postAttributeSpace: TextAndPosition;
    tagEnd: TextAndPosition;
  }

  function parseBlockHtmlStart(line: string, state: State): LineBlock {
    var matcher = new RegexMatchIterator();

    // TODO parse attributes
    if (!matcher.tryMatch(
      /^(<)([a-z\+]*)(.*?)([ \t]*)(>)$/i,
      line)) {
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
    state.continuationMode = StateContinuationMode.Html;

    var data: IBlockHtmlData = {
      content: new TextAndPosition(0, line),
      tagName: fakeData.tagName
    };

    return new LineBlock(LineBlockType.HtmlTagStart, data);
  }

  interface IBlockHtmlEndTag extends ILineBlockData {
    startTag: TextAndPosition;
    tagName: TextAndPosition;
    preCloseWhitespace: TextAndPosition;
    endTag: TextAndPosition;
    eolWhitespace: TextAndPosition;
  }

  function parseHtmlBlockContinuation(line: string, state: State): LineBlock {
    var matcher = new RegexMatchIterator();

    if (!matcher.tryMatch(/^(<\/)([a-z\-]+)([ \t]*)(>)([ \t]*)$/i, line)) {
      var textContent: ILineBlockData = {
        content: new TextAndPosition(0, line)
      };

      state.continuationMode = StateContinuationMode.Html;

      return new LineBlock(LineBlockType.HtmlContinuation, textContent);
    }

    var data: IBlockHtmlEndTag = {
      startTag: matcher.nextPosition(),
      tagName: matcher.nextPosition(),
      preCloseWhitespace: matcher.nextPosition(),
      endTag: matcher.nextPosition(),
      eolWhitespace: matcher.nextPosition(),
      content: new TextAndPosition(0, line),
    };

    state.continuationMode = StateContinuationMode.None;
    state.openHtmlTag = null;

    return new LineBlock(LineBlockType.HtmlTagEnd, data);
  }

  function parseLine(line: string, state: State, options: Options): LineBlock {
    var block: LineBlock;

    if (state.continuationMode === StateContinuationMode.Text) {
      if (line[0] == ' ' && options.disallowSimpleParagraphs !== true) {
        var startOfList = parseBlockListStart(line, state);
        if (startOfList !== null) {
          return startOfList;
        }
      }

      return parseBlockTextContinuation(line, state);
    } else if (state.continuationMode == StateContinuationMode.Html) {
      return parseHtmlBlockContinuation(line, state);
    } else if (state.continuationMode === StateContinuationMode.List) {
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

    if (isEmpty(line)) {
      state.lastLineWasBlank = true;
      return LineBlock.createEmpty(line);
    }

    state.lastLineWasBlank = false;
    state.continuationMode = StateContinuationMode.Text;
    return LineBlock.createText(line);
  }

  /**
   * Parse a series of lines into blocks of data
   */
  export function parseIntoBlocks(lines: string[], options: Options): LineBlock[] {
    var blocks = [];

    var state = new State();

    for (var i: number = 0; i < lines.length; i++) {
      var line = lines[i];
      var block: LineBlock = parseLine(line, state, options);
      blocks.push(block);
    }

    return blocks;
  }

  enum NodeType {
    Heading,
    Style,
    Quote,
    Text,
    UnorderedList,
    OrderedList,
    Html,
  }

  function parseInlineContent(text: string): ContentBlock {
    return null;
  }

  /**
   * Represents
   */
  class InlineContent {
  }

  /** Parsed inline content. */
  class ContentBlock {
  }

  /**
   * Represents a chunk of the document that has been parsed into a single block
   */
  class Node {
    public type: NodeType;

    constructor(type: NodeType) {
      this.type = type;
    }
  }

  class HeadingNode extends Node {
    /** The line from which the header came. */
    public origin: IBlockHeader;

    /** The line number that the header came from. */
    public lineNumber: number;

    /** The header-level (1 or more) of the heading */
    public level: number;

    constructor(lineBlock: IBlockHeader, lineNumber: number) {
      super(NodeType.Heading);

      this.origin = lineBlock;
      this.lineNumber = lineNumber;
    }
  }

  export function parseLineBlocksIntoNodes(blocks: LineBlock[], options: Options) {
    return blocks;
  }

  export function parse(lines: string[], options: Options = new Options()) {
    var blocks = parseIntoBlocks(lines, options);

    var nodes = parseLineBlocksIntoNodes(blocks, options);

    return nodes;
  }
}