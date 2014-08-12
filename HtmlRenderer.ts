module TextRight {
  export interface IRenderer {
    render(nodes: INode[]): any;
  }

  function htmlEscape(str) {
    // http://stackoverflow.com/questions/1219860/html-encoding-in-javascript-jquery
    // todo do replacement inline using lookup dictionary
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  export class HtmlRenderer {
    private encodeContent(inlineContent: IInlineContent): string {
      return htmlEscape(<string>inlineContent);
    }

    private createBlockTag(tagName: string, inlineContent: IInlineContent): string {
      return this.appendRaw(tagName, this.encodeContent(inlineContent));
    }

    private createBlock(tagName: string, children: INode[]): string {
      return this.appendRaw(tagName, this.render(children));
    }

    private appendRaw(tagName: string, content: string): string {
      return "<" + tagName + ">"
        + content
        + "</" + tagName + ">";
    }

    public render(nodes: INode[]): any {
      var html: string[] = nodes.map(node => {
        switch (node.type) {
          case NodeTypes.HEADING:
            var heading = <IHeadingNode>node;
            var level = Math.min(heading.level, 6);
            var textLevel = "H" + level;
            return this.createBlockTag(textLevel, heading.inlineContent);
            break;
          case NodeTypes.LISTORDERED:
            var orderedList = <IOrderedListNode>node;
            return this.appendRaw("OL", this.createBlock("LI", orderedList.children));
            break;
          case NodeTypes.LISTUNORDERED:
            var unorderedList = <IUnorderedListNode>node;
            return this.appendRaw("UL", this.createBlock("LI", unorderedList.children));
            break;
          case NodeTypes.PARAGRAPH:
            var paragraph = <IParagraphNode>node;
            return this.createBlockTag("P", paragraph.inlineContent);
            break;
          case NodeTypes.QUOTE:
            var quote = <IQuoteNode>node;
            return this.createBlock("QUOTE", quote.children);
            break;
          case NodeTypes.EMPTY:
            // TODO
            break;
          case NodeTypes.RAW:
            var raw = <IRawNode>node;
            return this.appendRaw(raw.name, raw.rawContent.join("\n"));
            break;
          default:
            throw Error("Unrecognized node type: " + node.type);
        }
      });

      return html.join("\n");
    }
  }
}