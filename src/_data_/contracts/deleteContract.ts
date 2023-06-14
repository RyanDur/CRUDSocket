import * as D from 'schemawax';

export const DeleteContract = D.object({
  required: {
    destroy: D.unknown
  }
});
