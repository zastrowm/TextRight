module TextRight {
  /**
   * Options for parsing TextRight
   */
  export class Options {
    constructor(
      public disallowSimpleParagraphs: boolean = false
      ) {
    }
  }

  export interface ILine {
    index: number;

    text: string;

    length: number;

    getFragment(start: number, end: number): LineFragment;

    getLineFragment(): LineFragment;
  }

  /**
   * Represents a single line of text that needs to be parsed.
   */
  export class Line implements ILine {
    private _text: string;
    private _index: number;

    /**
     * @param line the index of the line that the text represents.
     * @param text the actual text for the line.
     */
    constructor(index: number, text: string) {
      this._index = index;
      this._text = text;
    }

    public get text() {
      return this._text;
    }

    public get index() {
      return this._index;
    }

    public get length() {
      return this.text.length;
    }

    public getFragment(start: number, end: number = this.text.length): LineFragment {
      return new LineFragment(this, start, end);
    }

    public getLineFragment(): LineFragment {
      return new LineFragment(this, 0, this.text.length);
    }
  }

  /**
   * Holds the position of content within a string
   */
  export class LineFragment implements ILine {
    private cachedLine: string;

    constructor(public line: ILine, public start: number, public end: number) {
    }

    public get length() {
      return this.end - this.start;
    }

    public get index() {
      return this.line.index;
    }

    public get text(): string {
      if (this.cachedLine == null) {
        this.cachedLine = this.line.text.substring(this.start, this.end);
      }

      return this.cachedLine;
    }

    public getFragment(start: number, end: number = this.text.length): LineFragment {
      return new LineFragment(this.line, this.start + start, this.end + end);
    }

    public getLineFragment(): LineFragment {
      return new LineFragment(this.line, this.start, this.end);
    }
  }

  /**
   * Evaluates a regular expression against a line and takes each captured
   * group one after another
   */
  export class RegexMatchIterator {
    regex: RegExp;
    results: string[];
    lastPosition: number;
    currentResultIndex: number;
    line: ILine;

    public tryMatch(regex: RegExp, text: string, line: ILine): boolean {
      this.regex = regex;
      this.results = text.match(regex);
      this.lastPosition = 0;
      this.currentResultIndex = 1;
      this.line = line;

      return this.results != null;
    }

    public nextPosition() {
      var start = this.lastPosition;
      var result = this.results[this.currentResultIndex];
      this.lastPosition += result.length;
      this.currentResultIndex++;

      return this.line.getFragment(start, start + result.length);
    }
  }

  export class LineSearcher {
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

    public read(regex: RegExp): string[] {
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

  /**
   * Allows iterating through an array
   */
  export class ArrayIterator<T> {
    constructor(public array: T[], public index: number = 0) {
    }

    /** Check if the current position is valid */
    public get isValid(): boolean {
      return this.index < this.array.length;
    }

    /** Get the current element within the array.  Undefined if isValid is false */
    public get current(): T {
      return this.array[this.index];
    }

    /** Iterate to the next object, returning true if the item is current*/
    public next(): boolean {
      this.index++;
      return this.isValid;
    }

    /**
     * Look forward or backward into the array
     * @param seek the number of elements to look ahead (or back)
     */
    public peek(seek: number = 1): T {
      var peekIndex = this.index + seek;

      if (peekIndex < 0 || peekIndex >= this.array.length) {
        return null;
      } else {
        return this.array[peekIndex];
      }
    }

    /**
     * Continuing passing in the next item and consuming items until callback
     *  returns false
     */
    public peekAndConsume(callback: (item: T) => boolean) {
      var next = this.peek();

      while (next != null) {
        if (callback(next)) {
          this.next();
          next = this.peek();
        } else {
          break;
        }
      }
    }
  }
}