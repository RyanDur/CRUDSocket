import * as D from 'schemawax';

export const ErrorContract = D.object({
  required: {
    error: D.unknown
  }
});
