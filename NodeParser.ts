module TextRight {
  function parse(blocks: Block[]) {
  }

  /** A tag for blocks */
  export interface ITag {
    /** The name of the tag */
    name: string;
  }

  export interface IAttribute {
    key: string;
    value: string;
  }

  export interface IInlineContent {
  }

  export interface INode {
    type: string;

    tags: ITag[];

    children: INode[];
  }

  export interface IHeadingNode extends INode {
    level: number;

    inlineContent: IInlineContent;
  }

  export interface IQuoteNode extends INode {
  }

  export interface IListNode extends INode {
    /** The list-item prefix that was used for the first item. */
    listInitialValue: string;
  }

  export enum OrderedListNodeType {
    Decimal,
    DecimalLeadingZero,
    RomanLower,
    RomanUpper,
    AlphaLower,
    AlphaUpper,
    Any,
  }

  function countLowercase(str: string): number {
    var matches = str.match(/^[a-z]$/);
    if (matches == null) {
      return 0;
    } else {
      return matches.length;
    }
  }

  function determineOrderedListType(prefix: string): OrderedListNodeType {
    if (/^#+$/.test(prefix)) {
      return OrderedListNodeType.Any;
    } else if (/^[0-9]+$/.test(prefix)) {
      return prefix[0] == "0"
        ? OrderedListNodeType.DecimalLeadingZero
        : OrderedListNodeType.Decimal;
    } else if (/^[ivxlcdm]+$/i.test(prefix)) {
      // the number of matches of lowercase letters
      var isMainlyLowercase = countLowercase(prefix) / prefix.length > 0.5;

      return isMainlyLowercase
        ? OrderedListNodeType.RomanLower
        : OrderedListNodeType.RomanUpper;
    } else {
      // must be alpha
      // the number of matches of lowercase letters
      var isMainlyLowercase2 = countLowercase(prefix) / prefix.length > 0.5;

      return isMainlyLowercase2
        ? OrderedListNodeType.RomanLower
        : OrderedListNodeType.RomanUpper;
    }
  }

  export interface IOrderedListNode extends IListNode {
    listType: OrderedListNodeType
  }

  export enum UnorderedListNodeType {
    Asterix,
    Dash,
    Plus
  }

  function determineUnorderedListType(prefix: string) {
    switch (prefix) {
      case "*":
        return UnorderedListNodeType.Asterix;
      case "+":
        return UnorderedListNodeType.Plus;
      default:
        return UnorderedListNodeType.Dash;
    }
  }

  export interface IUnorderedListNode extends IListNode {
    listType: UnorderedListNodeType;
  }

  export class NodeParser {
    constructor(
      private options: Options = new Options(),
      private lineParser: LineParser = new LineParser(options),
      private blockParser: BlockParser = new BlockParser(options),
      private inlineParser: InlineParser = new InlineParser(options)) {
    }

    private createInlineNode(text: LineFragment): IInlineContent {
      // TODO
      return null;
    }

    private createStyleTag(styleBlock: IStyleBlock): ITag {
      return {
        name: styleBlock.content
      };
    }

    private getChildren(blocks: LineFragment[]): INode[] {
      var parsedLines = this.lineParser.parse(blocks);
      var parsedBlocks = this.blockParser.parse(parsedLines);
      return this.parse(parsedBlocks);
    }

    private createHeadingNode(block: IHeadingBlock, tags: ITag[]): IHeadingNode {
      return {
        type: "HEADING",
        inlineContent: this.createInlineNode(block.inlineContent),
        tags: tags,
        level: block.level,
        children: []
      };
    }

    private createQuoteNode(block: IQuoteBlock, tags: ITag[]): IQuoteNode {
      var children = this.getChildren(block.blockContent);

      return {
        type: "QUOTE",
        tags: tags,
        children: children,
      };
    }

    private createList(block: IListItemBlock, tags: ITag[]): IListNode {
      var children = this.getChildren(block.blockContent);

      if (block.isOrdered) {
        var orderedList: IOrderedListNode = {
          type: "LIST-ORDERED",
          children: children,
          listInitialValue: block.prefix,
          listType: determineOrderedListType(block.prefix),
          tags: tags
        };

        return orderedList;
      } else {
        var unorderedlist: IUnorderedListNode = {
          type: "LIST-UNORDERED",
          children: children,
          listInitialValue: block.prefix,
          tags: tags,
          listType: determineUnorderedListType(block.prefix)
        };

        return unorderedlist;
      }
    }

    public parse(blocks: Block[]): INode[] {
      var nodes: INode[] = [];
      var tags: ITag[] = [];
      var iterator = new ArrayIterator<Block>(blocks);

      while (iterator.isValid) {
        var shouldNotClear = false;
        var block = iterator.current;

        switch (block.blockType) {
          case BlockType.Heading:
            nodes.push(this.createHeadingNode(<IHeadingBlock>block.data, tags));
            break;
          case BlockType.ListItem:
            nodes.push(this.createList(<IListItemBlock>block.data, tags));
            break;

          case BlockType.Quote:
            nodes.push(this.createQuoteNode(<IQuoteBlock>block.data, tags));
            break;
          case BlockType.Raw:
            // TODO
            shouldNotClear = true;
            nodes.push(<any>{
              type: "RAW"
            });
            break;
          case BlockType.Style:
            tags.push(this.createStyleTag(<IStyleBlock>block.data));
            shouldNotClear = true;
            break;
          case BlockType.Empty:
            // TODO
            shouldNotClear = true;
            nodes.push(<any>{
              type: "EMPTY"
            });
            break;
          default:
            // throw new Error("Unrecognized block type: " + block.blockType);
        }

        if (shouldNotClear != true) {
          tags = [];
        }

        iterator.next();
      }

      // TODO consolidate list items
      // TODO remove empty items that aren't part of the rest of stuff

      return nodes;
    }
  }
} 