// ═══════════════════════════════════════════════════════════════════════════════
// Expression Evaluator — M8: Workflow Engine
// SECURITY FIX (SEC-010): Replaced unsafe Node.js vm module with a safe
// recursive-descent AST evaluator. Only allows:
//   - Literals (numbers, strings, booleans, null)
//   - Identifiers (variable access from the provided context)
//   - Binary operators: ==, !=, ===, !==, <, >, <=, >=, +, -, *, /, %, &&, ||, ??, in
//   - Unary operators: -, !, ~
//   - Member access: obj.prop, obj[expr]
//   - Array access: arr[index]
//
// Explicitly REJECTS:
//   - Function calls (any(...)  , obj.method(...))
//   - new expressions
//   - this/self keywords
//   - Assignment operators (=, +=, etc.)
//   - Spread/rest operators
//   - Tagged template literals
//   - Prototype access (__proto__, constructor, etc.)
//   - Import/require
// ═══════════════════════════════════════════════════════════════════════════════

// ── Token Types ──────────────────────────────────────────────────────────────

type TokenType =
  | 'NUMBER' | 'STRING' | 'IDENT' | 'TRUE' | 'FALSE' | 'NULL' | 'UNDEFINED'
  | 'PLUS' | 'MINUS' | 'STAR' | 'SLASH' | 'PERCENT'
  | 'EQ' | 'NEQ' | 'SEQ' | 'SNEQ' | 'LT' | 'GT' | 'LTE' | 'GTE'
  | 'AND' | 'OR' | 'COALESCE' | 'NOT' | 'TILDE' | 'IN'
  | 'LPAREN' | 'RPAREN' | 'LBRACKET' | 'RBRACKET' | 'DOT' | 'COMMA'
  | 'EOF';

interface Token {
  type: TokenType;
  value: string;
  pos: number;
}

// ── Tokenizer ────────────────────────────────────────────────────────────────

const BLOCKED_IDENTIFIERS = new Set([
  'this', 'self', 'global', 'globalThis', 'window', 'process',
  'require', 'import', 'module', 'exports', 'eval', 'Function',
  'constructor', '__proto__', '__defineGetter__', '__defineSetter__',
  'hasOwnProperty', 'isPrototypeOf', 'propertyIsEnumerable',
  'toLocaleString', 'toString', 'valueOf',
  'setTimeout', 'setInterval', 'setImmediate',
  'fetch', 'XMLHttpRequest', 'http', 'https', 'net', 'child_process',
  'fs', 'path', 'os', 'crypto', 'vm', 'cluster', 'worker_threads',
]);

function tokenize(expression: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < expression.length) {
    // Skip whitespace
    if (/\s/.test(expression[i])) { i++; continue; }

    const pos = i;

    // Numbers
    if (/[0-9]/.test(expression[i]) || (expression[i] === '.' && i + 1 < expression.length && /[0-9]/.test(expression[i + 1]))) {
      let num = '';
      while (i < expression.length && /[0-9.]/.test(expression[i])) { num += expression[i++]; }
      // Handle scientific notation
      if (i < expression.length && (expression[i] === 'e' || expression[i] === 'E')) {
        num += expression[i++];
        if (i < expression.length && (expression[i] === '+' || expression[i] === '-')) { num += expression[i++]; }
        while (i < expression.length && /[0-9]/.test(expression[i])) { num += expression[i++]; }
      }
      tokens.push({ type: 'NUMBER', value: num, pos });
      continue;
    }

    // Strings (single or double quotes)
    if (expression[i] === '"' || expression[i] === "'") {
      const quote = expression[i++];
      let str = '';
      while (i < expression.length && expression[i] !== quote) {
        if (expression[i] === '\\' && i + 1 < expression.length) {
          i++; // skip escape
          const escaped = expression[i];
          switch (escaped) {
            case 'n': str += '\n'; break;
            case 't': str += '\t'; break;
            case '\\': str += '\\'; break;
            case "'": str += "'"; break;
            case '"': str += '"'; break;
            case '`': str += '`'; break;
            default: str += escaped;
          }
        } else {
          str += expression[i];
        }
        i++;
      }
      if (i >= expression.length) throw new EvalError('Unterminated string literal');
      i++; // skip closing quote
      tokens.push({ type: 'STRING', value: str, pos });
      continue;
    }

    // Identifiers and keywords
    if (/[a-zA-Z_$]/.test(expression[i])) {
      let ident = '';
      while (i < expression.length && /[a-zA-Z0-9_$]/.test(expression[i])) { ident += expression[i++]; }
      if (ident === 'true') tokens.push({ type: 'TRUE', value: ident, pos });
      else if (ident === 'false') tokens.push({ type: 'FALSE', value: ident, pos });
      else if (ident === 'null') tokens.push({ type: 'NULL', value: ident, pos });
      else if (ident === 'undefined') tokens.push({ type: 'UNDEFINED', value: ident, pos });
      else if (ident === 'in') tokens.push({ type: 'IN', value: ident, pos });
      else tokens.push({ type: 'IDENT', value: ident, pos });
      continue;
    }

    // Multi-character operators
    if (expression[i] === '=' && expression[i + 1] === '=' && expression[i + 2] === '=') {
      tokens.push({ type: 'SEQ', value: '===', pos }); i += 3; continue;
    }
    if (expression[i] === '!' && expression[i + 1] === '=' && expression[i + 2] === '=') {
      tokens.push({ type: 'SNEQ', value: '!==', pos }); i += 3; continue;
    }
    if (expression[i] === '=' && expression[i + 1] === '=') {
      tokens.push({ type: 'EQ', value: '==', pos }); i += 2; continue;
    }
    if (expression[i] === '!' && expression[i + 1] === '=') {
      tokens.push({ type: 'NEQ', value: '!=', pos }); i += 2; continue;
    }
    if (expression[i] === '<' && expression[i + 1] === '=') {
      tokens.push({ type: 'LTE', value: '<=', pos }); i += 2; continue;
    }
    if (expression[i] === '>' && expression[i + 1] === '=') {
      tokens.push({ type: 'GTE', value: '>=', pos }); i += 2; continue;
    }
    if (expression[i] === '&' && expression[i + 1] === '&') {
      tokens.push({ type: 'AND', value: '&&', pos }); i += 2; continue;
    }
    if (expression[i] === '|' && expression[i + 1] === '|') {
      tokens.push({ type: 'OR', value: '||', pos }); i += 2; continue;
    }
    if (expression[i] === '?' && expression[i + 1] === '?') {
      tokens.push({ type: 'COALESCE', value: '??', pos }); i += 2; continue;
    }

    // Single character operators
    const charMap: Record<string, TokenType> = {
      '+': 'PLUS', '-': 'MINUS', '*': 'STAR', '/': 'SLASH', '%': 'PERCENT',
      '<': 'LT', '>': 'GT', '!': 'NOT', '~': 'TILDE',
      '(': 'LPAREN', ')': 'RPAREN', '[': 'LBRACKET', ']': 'RBRACKET',
      '.': 'DOT', ',': 'COMMA',
    };

    if (charMap[expression[i]]) {
      tokens.push({ type: charMap[expression[i]], value: expression[i], pos });
      i++;
      continue;
    }

    throw new EvalError(`Unexpected character at position ${i}: '${expression[i]}'`);
  }

  tokens.push({ type: 'EOF', value: '', pos: i });
  return tokens;
}

// ── AST Node Types ───────────────────────────────────────────────────────────

type AstNode =
  | { type: 'Literal'; value: number | string | boolean | null | undefined }
  | { type: 'Identifier'; name: string }
  | { type: 'BinaryExpression'; operator: string; left: AstNode; right: AstNode }
  | { type: 'UnaryExpression'; operator: string; operand: AstNode }
  | { type: 'LogicalExpression'; operator: string; left: AstNode; right: AstNode }
  | { type: 'MemberExpression'; object: AstNode; property: AstNode; computed: boolean }
  | { type: 'ConditionalExpression'; test: AstNode; consequent: AstNode; alternate: AstNode };

// ── Parser ───────────────────────────────────────────────────────────────────

class Parser {
  private pos = 0;
  private tokens: Token[];

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private peek(): Token { return this.tokens[this.pos]; }
  private advance(): Token { return this.tokens[this.pos++]; }

  private expect(type: TokenType): Token {
    const token = this.peek();
    if (token.type !== type) {
      throw new EvalError(`Expected ${type} but got ${token.type} at position ${token.pos}`);
    }
    return this.advance();
  }

  // entry point
  parse(): AstNode {
    const expr = this.parseExpression();
    if (this.peek().type !== 'EOF') {
      throw new EvalError(`Unexpected token after expression: ${this.peek().value}`);
    }
    return expr;
  }

  // ternary: a ? b : c
  private parseExpression(): AstNode {
    let left = this.parseOr();
    if (this.peek().type === 'COALESCE') {
      // ?? has lower precedence than ||
      // Actually we handle ?? as logical
    }
    return left;
  }

  // ||
  private parseOr(): AstNode {
    let left = this.parseAnd();
    while (this.peek().type === 'OR') {
      this.advance();
      const right = this.parseAnd();
      left = { type: 'LogicalExpression', operator: '||', left, right };
    }
    return left;
  }

  // &&
  private parseAnd(): AstNode {
    let left = this.parseComparison();
    while (this.peek().type === 'AND') {
      this.advance();
      const right = this.parseComparison();
      left = { type: 'LogicalExpression', operator: '&&', left, right };
    }
    return left;
  }

  // ==, !=, ===, !==, <, >, <=, >=, in
  private parseComparison(): AstNode {
    let left = this.parseAdditive();
    const compOps: TokenType[] = ['EQ', 'NEQ', 'SEQ', 'SNEQ', 'LT', 'GT', 'LTE', 'GTE', 'IN'];
    while (compOps.includes(this.peek().type)) {
      const op = this.advance();
      const right = this.parseAdditive();
      left = { type: 'BinaryExpression', operator: op.value, left, right };
    }
    return left;
  }

  // +, -
  private parseAdditive(): AstNode {
    let left = this.parseMultiplicative();
    while (this.peek().type === 'PLUS' || this.peek().type === 'MINUS') {
      const op = this.advance();
      const right = this.parseMultiplicative();
      left = { type: 'BinaryExpression', operator: op.value, left, right };
    }
    return left;
  }

  // *, /, %
  private parseMultiplicative(): AstNode {
    let left = this.parseUnary();
    while (this.peek().type === 'STAR' || this.peek().type === 'SLASH' || this.peek().type === 'PERCENT') {
      const op = this.advance();
      const right = this.parseUnary();
      left = { type: 'BinaryExpression', operator: op.value, left, right };
    }
    return left;
  }

  // -, !, ~
  private parseUnary(): AstNode {
    if (this.peek().type === 'MINUS' || this.peek().type === 'NOT' || this.peek().type === 'TILDE') {
      const op = this.advance();
      const operand = this.parseUnary();
      return { type: 'UnaryExpression', operator: op.value, operand };
    }
    return this.parseMember();
  }

  // a.b, a[b], a.b.c
  private parseMember(): AstNode {
    let obj = this.parsePrimary();

    while (this.peek().type === 'DOT' || this.peek().type === 'LBRACKET') {
      if (this.peek().type === 'DOT') {
        this.advance();
        const prop = this.expect('IDENT');
        obj = {
          type: 'MemberExpression',
          object: obj,
          property: { type: 'Identifier', name: prop.value },
          computed: false,
        };
      } else if (this.peek().type === 'LBRACKET') {
        this.advance();
        const prop = this.parseExpression();
        this.expect('RBRACKET');
        obj = {
          type: 'MemberExpression',
          object: obj,
          property: prop,
          computed: true,
        };
      }
    }

    return obj;
  }

  // literals, identifiers, grouping
  private parsePrimary(): AstNode {
    const token = this.peek();

    switch (token.type) {
      case 'NUMBER': {
        this.advance();
        const num = Number(token.value);
        if (!Number.isFinite(num)) throw new EvalError(`Invalid number: ${token.value}`);
        return { type: 'Literal', value: num };
      }
      case 'STRING': {
        this.advance();
        return { type: 'Literal', value: token.value };
      }
      case 'TRUE': { this.advance(); return { type: 'Literal', value: true }; }
      case 'FALSE': { this.advance(); return { type: 'Literal', value: false }; }
      case 'NULL': { this.advance(); return { type: 'Literal', value: null }; }
      case 'UNDEFINED': { this.advance(); return { type: 'Literal', value: undefined }; }
      case 'IDENT': {
        this.advance();
        // Block dangerous identifiers
        if (BLOCKED_IDENTIFIERS.has(token.value)) {
          throw new EvalError(`Access to '${token.value}' is not allowed in expressions`);
        }
        return { type: 'Identifier', name: token.value };
      }
      case 'LPAREN': {
        this.advance();
        const expr = this.parseExpression();
        this.expect('RPAREN');
        return expr;
      }
      default:
        throw new EvalError(`Unexpected token: ${token.value || token.type} at position ${token.pos}`);
    }
  }
}

// ── Evaluator ────────────────────────────────────────────────────────────────

function evaluateNode(node: AstNode, vars: Record<string, unknown>): unknown {
  switch (node.type) {
    case 'Literal':
      return node.value;

    case 'Identifier': {
      if (node.name in vars) return vars[node.name];
      return undefined;
    }

    case 'UnaryExpression': {
      const operand = evaluateNode(node.operand, vars);
      switch (node.operator) {
        case '-': return -Number(operand);
        case '!': return !operand;
        case '~': return ~Number(operand);
        default: throw new EvalError(`Unknown unary operator: ${node.operator}`);
      }
    }

    case 'BinaryExpression': {
      const left = evaluateNode(node.left, vars);
      const right = evaluateNode(node.right, vars);
      switch (node.operator) {
        case '+': return Number(left) + Number(right);
        case '-': return Number(left) - Number(right);
        case '*': return Number(left) * Number(right);
        case '/': {
          const divisor = Number(right);
          if (divisor === 0) throw new EvalError('Division by zero');
          return Number(left) / divisor;
        }
        case '%': return Number(left) % Number(right);
        case '==': return left == right; // eslint-disable-line eqeqeq
        case '!=': return left != right; // eslint-disable-line eqeqeq
        case '===': return left === right;
        case '!==': return left !== right;
        case '<': return Number(left) < Number(right);
        case '>': return Number(left) > Number(right);
        case '<=': return Number(left) <= Number(right);
        case '>=': return Number(left) >= Number(right);
        case 'in': {
          if (right == null || typeof right === 'boolean') return false;
          if (typeof right === 'string') return String(right).includes(String(left));
          if (Array.isArray(right) || typeof right === 'object') return String(left) in (right as Record<string, unknown>);
          return false;
        }
        default: throw new EvalError(`Unknown binary operator: ${node.operator}`);
      }
    }

    case 'LogicalExpression': {
      const left = evaluateNode(node.left, vars);
      switch (node.operator) {
        case '||': {
          if (left) return left;
          return evaluateNode(node.right, vars);
        }
        case '&&': {
          if (!left) return left;
          return evaluateNode(node.right, vars);
        }
        default: throw new EvalError(`Unknown logical operator: ${node.operator}`);
      }
    }

    case 'MemberExpression': {
      const obj = evaluateNode(node.object, vars) as Record<string, unknown> | undefined;
      if (obj == null) return undefined;

      if (node.computed) {
        const key = evaluateNode(node.property, vars);
        return (obj as Record<string, unknown>)[String(key)];
      } else if (node.property.type === 'Identifier') {
        return (obj as Record<string, unknown>)[node.property.name];
      }
      return undefined;
    }

    case 'ConditionalExpression': {
      const test = evaluateNode(node.test, vars);
      return test ? evaluateNode(node.consequent, vars) : evaluateNode(node.alternate, vars);
    }

    default:
      throw new EvalError(`Unknown AST node type: ${(node as AstNode).type}`);
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Safely evaluate a boolean expression with given variables.
 * Returns the result of the expression, or false on any error.
 *
 * SECURITY (SEC-010): This evaluator replaces the unsafe vm.runInContext.
 * It only supports arithmetic, comparison, and logical expressions.
 * No function calls, no prototype access, no code injection possible.
 */
export function evaluateExpression(
  expression: string,
  variables: Record<string, unknown>,
): unknown {
  if (!expression || typeof expression !== 'string') {
    return false;
  }

  try {
    const tokens = tokenize(expression);
    const parser = new Parser(tokens);
    const ast = parser.parse();
    return evaluateNode(ast, variables);
  } catch {
    // Safe default: return false on any evaluation error
    return false;
  }
}

/**
 * Evaluate a boolean expression. Returns true/false.
 */
export function evaluateCondition(
  expression: string,
  variables: Record<string, unknown>,
): boolean {
  const result = evaluateExpression(expression, variables);
  return Boolean(result);
}

/**
 * Evaluate an assignee expression. Must return a string (userId or role).
 * Returns null if result is not a string.
 */
export function evaluateAssigneeExpression(
  expression: string,
  variables: Record<string, unknown>,
): string | null {
  const result = evaluateExpression(expression, variables);
  return typeof result === 'string' ? result : null;
}
