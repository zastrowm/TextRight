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
  }

  export interface IHeadingNode extends INode {
    level: number;

    inlineContent: IInlineContent;
  }

  export interface IQuoteNode extends INode {
    children: INode[];
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

    private getChildren(blocks: LineFragment[]): INode[]{
      // TODO
      return null;
    }

    private createHeadingNode(block: IHeadingBlock, tags: ITag[]): IHeadingNode {
      return {
        type: "HEADING",
        inlineContent: this.createInlineNode(block.inlineContent),
        tags: tags,
        level: block.level
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

    public parse(blocks: Block[]): IBlockNode[] {
      var nodes: IBlockNode[] = [];
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

            break;

          case BlockType.Quote:

            break;
          case BlockType.Raw:

            break;
          case BlockType.Style:
            tags.push({
              name: (<IStyleBlock>block.data).content
            });
            shouldNotClear = true;
            break;
          case BlockType.Empty:
            shouldNotClear = true;
            break;
          default:
            throw new Error("Unrecognized block type: " + block.blockType);
        }

        if (!shouldNotClear) {
          tags.length = 0;
        }
      }

      return nodes;
    }
  }
} 