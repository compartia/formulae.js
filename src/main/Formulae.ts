export interface Formula {
    value: number;
    equation(maxDepth?: number): string;
    symEquation(maxDepth?: number): string;
    valueFormatted: string;
    name: string;
    description: string;
    format: (v: number) => string;
    parent: Formula;
    terminal: boolean;
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
    parent: Formula;
    name: string;
    description: string;
    format: (v: number) => string;
    terminal: boolean;

    constructor() {
        this.format = (x: number) => '' + x;
    }

    get valueFormatted() {
        return this.format(this.value);
    }

    get value(): number {
        throw 'abstract';
    }

    abstract equation(maxDepth?: number): string;
    abstract symEquation(maxDepth?: number): string;

}

export class Constant extends AFormula {

    private _value: number;
    
    get value(): number {
        return this._value;
    }

    constructor(value: number, format: (v: number) => string, name?: string, description?: string) {
        super();
        this._value = value;
        if (format) {
            this.format = format;
        }

        this.name = name;
        this.description = description;
    }

    public shallowEquation(maxDepth: number): string {
        return this.equation(maxDepth);
    }

    public equation(maxDepth?: number): string {
        return this.format(this.value);
    }

    public symEquation(maxDepth?: number): string {
        return this.name ? this.name : this.format(this.value);
    }
}

export class MulMul extends AFormula {
    args: Formula[];

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
            let names: string[] = [];
            for (let a of this.args) {
                names.push(a.name);
            }

            this.name = names.join(' × ');
        }


        for (let a of args) {
            a.parent = this;
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

        let cargs: string[] = [];
        for (let a of this.args) {
            cargs.push(a.symEquation(maxDepth - 1));
        }

        return cargs.join(' × ');
    }
}
export class Func extends AFormula {

    args: Formula[];
    func: (args: number[]) => number;
    funcName: string;

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

        for (let a of args) {
            a.parent = this;
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

        let cargs: string[] = [];
        for (let a of this.args) {
            cargs.push(a.symEquation(maxDepth - 1));
        }

        return this.funcName + '(' + cargs.join(', ') + ')';
    }
}



export abstract class BinOp extends AFormula {
    a: Formula;
    b: Formula;
    op: string;

    constructor(a: Formula, b: Formula, format?: (v: number) => string, name?: string) {
        super();
        this.a = a;
        this.b = b;
        this.name = name;

        a.parent = this;
        b.parent = this;

        if (format) {
            this.format = format;
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

        if (a.format !== b.format) {
            throw 'Incompatible units:' + a.valueFormatted + ' and ' + b.valueFormatted;
        }

        super(a, b, a.format);
        this.op = '+';
        this.name = name;
    }

    get value(): number {
        return this.a.value + this.b.value;
    }
    public equation(maxDepth?: number): string {
        if (maxDepth < 1 || this.terminal) {
            return this.valueFormatted;
        }
        return ' (' + super.equation(maxDepth) + ') ';
    }

    public symEquation(maxDepth?: number): string {
        if (maxDepth < 1 || this.terminal) {
            return this.name;
        }
        if (this.parent) {
            return super.braket(super.symEquation(maxDepth));
        } else {
            return super.symEquation(maxDepth);
        }
    }
}


export class Minus extends Plus {
    constructor(a: Formula, b: Formula, name?: string) {
        super(a, b, name);
        this.op = '-';
    }
    get value(): number {
        return this.a.value - this.b.value;
    }
}


export class Div extends BinOp {
    constructor(a: Formula, b: Formula, format?: (v: number) => string, name?: string) {
        super(a, b, format, name);
        this.op = '/';
    }

    get value(): number {
        return this.a.value / this.b.value;
    }

}


export class Mul extends BinOp {
    constructor(a: Formula, b: Formula, format?: (v: number) => string, name?: string) {
        super(a, b, format, name);
        this.op = '×';
    }
    get value(): number {
        return this.a.value * this.b.value;
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
