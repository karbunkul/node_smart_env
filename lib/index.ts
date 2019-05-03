import * as fs from 'fs';
import * as path from 'path';
import moduleDebug from 'debug';

const debug = moduleDebug('module:smart-env');

enum VariableType {
  boolean = 'boolean',
  float = 'float',
  number = 'number',
  string = 'string'
}

export interface IVariable {
  type: VariableType;
  value: string | boolean | number;
}

export interface ISmartEnvVariables {
  version: string;
  lastUpdated: number;
  variables: Map<string, IVariable>;
}

class SmartEnv {
  private static _instance: SmartEnv;
  private _isInit: boolean = false;
  private _variables: Map<String, IVariable> = new Map<String, IVariable>();

  constructor() {
    if (typeof SmartEnv._instance === 'object') {
      debug('create instance');
      return SmartEnv._instance;
    }

    SmartEnv._instance = this;
    return this;
  }

  private static _isInt(n: any) {
    return Number(n) === n && n % 1 === 0;
  }

  private static _isFloat(n: any) {
    return Number(n) === n && n % 1 !== 0;
  }

  private _isInitWarning() {
    if (!this._isInit)
      throw new Error(
        'smart-env does not initialized, run init() or initFromJson for fix it'
      );
  }

  private static _validatePayload(data: ISmartEnvVariables): boolean {
    const { version, variables } = data;
    if (!version) return false;
    if (typeof version !== 'string') return false;

    if (!variables) return false;

    for (let name in variables) {
      // @ts-ignore
      const { type = undefined, value = undefined } = variables[name];

      if (!type || value === undefined || value === null) return false;
      switch (type) {
        case VariableType.number: {
          if (!SmartEnv._isInt(value)) return false;
          break;
        }

        case VariableType.float: {
          if (!SmartEnv._isFloat(value)) return false;
          break;
        }

        case VariableType.boolean: {
          if (typeof value !== 'boolean') return false;
          break;
        }

        default: {
          if (typeof value !== 'string') return false;
          break;
        }
      }
    }
    debug('validate payload is successful');
    return true;
  }

  private _castToType(
    name: string,
    type: VariableType
  ): string | number | boolean {
    if (this.hasVariable(name)) {
      // @ts-ignore
      const { type: varType, value: varValue } = this._variables[name];
      if (varType === type) {
        return varValue;
      } else {
        const message = `${name} is not cast to ${type}`;
        throw new Error(message);
      }
    } else {
      const message = `${name} variable doesn't exist`;
      throw new Error(message);
    }
  }

  async init(filepath?: string): Promise<boolean> {
    if (!this._isInit) {
      if (!filepath)
        filepath = path.resolve(__dirname) + '/smart-env.vars.json';

      const fn = path.isAbsolute(filepath) ? filepath : path.resolve(filepath);
      debug(`source file - ${fn}`);
      if (!fs.existsSync(fn)) {
        const msg = `filename "${fn}" not exist`;
        debug(msg);
        throw new Error(msg);
      }
      try {
        const file = fs.readFileSync(fn, { encoding: 'utf8' });
        const json = JSON.parse(file);

        await this.initFromJson(json);
        return true;
      } catch (e) {
        throw e
      }
    } else {
      debug('smart-env already init');
    }

    return false;
  }

  initFromJson(data: ISmartEnvVariables) {
    if (!this._isInit) {
      debug('initFromJson');
      if (SmartEnv._validatePayload(data)) {
        this._isInit = true;
        this._variables = data.variables;
      } else {
        throw new Error('wrong payload, run smart-env for generate config');
      }
    } else {
      debug('smart-env already init');
    }
  }

  hasVariable(name: string): boolean {
    this._isInitWarning();
    return this._variables.hasOwnProperty(name);
  }

  intVariable(name: string): number {
    this._isInitWarning();
    return this._castToType(name, VariableType.number) as number;
  }

  floatVariable(name: string): number {
    this._isInitWarning();
    return this._castToType(name, VariableType.float) as number;
  }

  boolVariable(name: string): boolean {
    this._isInitWarning();
    return this._castToType(name, VariableType.boolean) as boolean;
  }

  stringVariable(name: string): string {
    this._isInitWarning();
    return this._castToType(name, VariableType.string) as string;
  }
}

export default new SmartEnv();
