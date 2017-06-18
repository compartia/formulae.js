
export interface Formula {
    value: number;


    valueFormatted: string;
    name: string;
    description: string;
    format: (v: number) => string;
    terminal: boolean;
    expanded: boolean;

    isFunction: boolean;
    dirty: boolean;

    equation(maxDepth?: number): string;
    symEquation(maxDepth?: number): string;

    toggle(): void;
}

export class FormulaFactory {


    public log(a: Formula, format?: (v: number) => string): Func {
        return new Func([a], (x) => Math.log(x[0]), this.df(a, format), 'log(' + a.name + ')', 'log');
    }

    public abs(a: Formula, format?: (v: number) => string): Func {
        return new Func([a], (x) => Math.abs(x[0]), this.df(a, format), '|' + a.name + '|', 'abs');
    }

    public sqrt(a: Formula, format?: (v: number) => string): Func {
        return new Func([a], (x) => Math.sqrt(x[0]), this.df(a, format), 'sqrt(' + a.name + ')', 'sqrt');
    }

    public round(a: Formula, format?: (v: number) => string): Func {
        return new Func([a], (x) => Math.round(x[0]), this.df(a, format), 'round(' + a.name + ')', 'round');
    }

    public floor(a: Formula, format?: (v: number) => string): Func {
        return new Func([a], (x) => Math.floor(x[0]), this.df(a, format), 'floor(' + a.name + ')', 'floor');
    }

    public pow(a: Formula, b: Formula, format?: (v: number) => string): Pow {
        return new Pow(a, b, this.df(a, format));
    }

    public max(a: Formula, b: Formula): Func {
        return new Func([a, b], (x) => Math.max(x[0], x[1]), a.format, 'max(' + a.name + ', ' + b.name + ')', 'max');
    }

    public div(a: Formula, b: Formula, format?: (v: number) => string): Div {
        return new Div(a, b, this.df(a, format));
    }

    private df(a: Formula, format: (v: number) => string): (v: number) => string {
        if (!format) {
            return a.format;
        }
        return format;
    }

}

export abstract class AFormula implements Formula {

    _name: string;
    description: string;
    format: (v: number) => string;
    terminal: boolean;
    _valueFormattedCached: string;
    private _expanded: boolean;


    public mul(b: Formula, format?: (v: number) => string, name?: string): Mul {
        return new Mul(this, b, format, name);
    }

    public div(b: Formula, format?: (v: number) => string, name?: string): Div {
        return new Div(this, b, format, name);
    }

    public plus(b: Formula, name?: string): Plus {
        return new Plus(this, b, name);
    }

    public minus(b: Formula, name?: string): Minus {
        return new Minus(this, b, name);
    }

    get isFunction() {
        return false;
    }

    get expanded() {
        return this._expanded;
    }

    set expanded(e: boolean) {
        this._expanded = e;
    }

    public toggle() {
        this._expanded = !this._expanded;
    }

    get name(): string {
        return this._name ? this._name : this.valueFormatted;
    }

    set name(name: string) {
        this._name = name;
    }

    constructor() {
        this.format = (x: number) => '' + x;
    }

    get valueFormatted(): string {
        if (this.dirty) {
            this._valueFormattedCached = this.format(this.value);
        }
        return this._valueFormattedCached;

    }

    get dirty(): boolean{
        throw "unimplemented";
    }
    abstract get value(): number;
    abstract equation(maxDepth?: number): string;
    abstract symEquation(maxDepth?: number): string;

}

export abstract class Op extends AFormula {
    args: Formula[];

    get dirty(): boolean {
        for (let a of this.args) {
            if (a.dirty) {
                return true;
            }
        }
        return false;
    }
}

export class Constant extends AFormula {
    private _value: number;
    
    constructor(value: number, format: (v: number) => string, name?: string, description?: string) {
        super();
        this.value = value;
        if (format) {
            this.format = format;
        }

        this.name = name;
        this.description = description;
    }

    get value(): number {
        return this._value;
    }

    set value(value: number) {
        if (this._value !== value) {
            this._value = value;
            this._valueFormattedCached = null;
        }
    }

    get dirty(): boolean {
        return this._valueFormattedCached === null;
    }

    // get valueFormatted() {
    //     if (!this._valueFormatted) {
    //         this._valueFormatted = this.format(this.value);
    //     }
    //     return this._valueFormatted;
    // }

    get isFunction(): boolean {
        return false;
    }

    get expanded(): boolean {
        return true;
    }

    get terminal(): boolean {
        return true;
    }



    public equation(maxDepth?: number): string {
        return this.format(this.value);
    }

    public symEquation(maxDepth?: number): string {
        return this.name ? this.name : this.format(this.value);
    }
}

export class MulMul extends Op {

    op: string = '×';
    funcName: string;

    constructor(args: Formula[], format?: (v: number) => string, valueName?: string) {
        super();
        this.args = args;

        if (format) {
            this.format = format;
        } else {
            this.format = args[0].format;
        }

        if (valueName) {
            this.name = valueName;
        } else {
            let names = [];
            for (let a of this.args) {
                names.push(a.name);
            }

            this.name = names.join(' × ');
        }
    }



    get argValues(): number[] {
        let cargs: number[] = [];
        for (let a of this.args) {
            cargs.push(a.value);
        }
        return cargs;
    }

    get value() {
        let r = 1;
        for (let a of this.args) {
            r *= a.value;
        }
        return r;
    }

    public equation(maxDepth?: number): string {
        return this.valueFormatted;
    }

    public symEquation(maxDepth?: number): string {
        if (maxDepth <= 0) {
            return this.name;
        }

        let cargs = [];
        for (let a of this.args) {
            cargs.push(a.symEquation(maxDepth - 1));
        }

        return cargs.join(' × ');
    }
}
export class Func extends Op {


    func: (args: number[]) => number;
    funcName: string;
    op = ',';

    get isFunction() {
        return true;
    }

    constructor(args: Formula[], func: (args: number[]) => number, format: (v: number) => string, valueName?: string, funcName?: string) {
        super();
        this.args = args;
        this.func = func;
        if (format) {
            this.format = format;
        }
        this.name = valueName;
        if (funcName) {
            this.funcName = funcName;
        } else {
            this.funcName = valueName;
        }


    }

    get argValues(): number[] {
        let cargs: number[] = [];
        for (let a of this.args) {
            cargs.push(a.value);
        }
        return cargs;
    }

    get value() {
        return this.func(this.argValues);
    }

    public equation(maxDepth?: number): string {
        return this.valueFormatted;
    }

    public symEquation(maxDepth?: number): string {
        if (maxDepth < 1) {
            return this.name;
        }

        let cargs = [];
        for (let a of this.args) {
            cargs.push(a.symEquation(maxDepth - 1));
        }

        return this.funcName + '(' + cargs.join(', ') + ')';
    }
}


export abstract class UnOp extends Op {
}

export abstract class BinOp extends Op {

    op: string;

    get a() {
        return this.args[0];
    }

    get b() {
        return this.args[1];
    }

    constructor(a: Formula, b: Formula, format?: (v: number) => string, name?: string) {
        super();
        this.args = [a, b];
        this.name = name;


        if (format) {
            this.format = format;
        } else {
            this.format = a.format;
        }
    }

    public equation(maxDepth?: number): string {
        if (maxDepth < 1 || this.terminal) {
            return this.valueFormatted;
        }
        return this.a.equation(maxDepth - 1) + ' ' + this.op + ' ' + this.b.equation(maxDepth - 1);
    }

    public symEquation(maxDepth?: number): string {
        if (maxDepth < 1 || this.terminal) {
            return this.name;
        }
        return this.a.symEquation(maxDepth - 1) + ' ' + this.op + ' ' + this.b.symEquation(maxDepth - 1);
    }

    public braket(val: any): string {
        return '(' + val + ')';
    }

}


export class Plus extends BinOp {
    constructor(a: Formula, b: Formula, name?: string) {

        if (a.format != b.format) {
            console.error('Incompatible arguments:' + a.valueFormatted + ' and ' + b.valueFormatted);
        }

        super(a, b, a.format);
        this.op = '+';
        this.name = name;
    }

    get value(): number {
        return this.args[0].value + this.args[1].value;
    }

    public equation(maxDepth?: number): string {
        if (maxDepth < 1 || this.terminal) {
            return this.valueFormatted;
        }
        return ' (' + super.equation(maxDepth) + ') ';
    }

    public symEquation(maxDepth?: number): string {
        if (maxDepth < 1 || this.terminal) {
            return this.name ? this.name : this.valueFormatted;
        }

        return super.braket(super.symEquation(maxDepth));
    }
}


export class Minus extends Plus {
    constructor(a: Formula, b: Formula, name?: string) {
        super(a, b, name);
        this.op = '-';
    }

    get value(): number {
        return this.args[0].value - this.args[1].value;
    }
}


export class Div extends BinOp {
    constructor(a: Formula, b: Formula, format?: (v: number) => string, name?: string) {
        super(a, b, format, name);
        this.op = '/';
    }

    get value(): number {
        return this.args[0].value / this.args[1].value;
    }

}


export class Mul extends BinOp {
    constructor(a: Formula, b: Formula, format?: (v: number) => string, name?: string) {
        super(a, b, format, name);
        this.op = '×';
    }

    get value(): number {
        return this.args[0].value * this.args[1].value;
    }
}


export class Pow extends BinOp {
    constructor(a: Formula, b: Formula, format?: (v: number) => string, name?: string) {
        super(a, b, format, name);
        this.op = '^';
    }
    get value(): number {
        return Math.pow(this.a.value, this.b.value);
    }
}