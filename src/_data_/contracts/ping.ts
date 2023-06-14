import * as D from 'schemawax';

export const PingContract = D.object({
  required: {
    type: D.literal('ping')
  },
  optional: {
    message: D.number
  }
});
