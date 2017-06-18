import { expect } from 'chai';
import { Constant, Plus } from '../../src/formulae';


describe('Formulae Test', () => {
  let a1: Constant;
  let a2: Constant;

  beforeEach(function() {
    const format: ((v: number) => string) = (x: number) => x + "";
    a1 = new Constant(2, format);
    a2 = new Constant(3, format);
  });

  it('Should return 2', () => {
    const c: Constant = new Constant(2, null);
    expect(c.value).to.equal(2);
  });

  it('Should return 5', () => {
    const f: Plus = new Plus(a1, a2);
    expect(f.value).to.equal(5);
  });

  it('Should return 5', () => {
    const f = a1.plus(a2);
    expect(f.value).to.equal(5);
  });

  it('Should return 6', () => {
    const f = a1.mul(a2);
    expect(f.value).to.equal(6);
  });

  it('Should return 1.5', () => {
    const f = a2.div(a1);
    expect(f.value).to.equal(1.5);
  });

});
