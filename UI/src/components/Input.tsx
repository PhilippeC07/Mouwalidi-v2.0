import {
  useRef,
  useState,
  forwardRef,
  useCallback,
  useImperativeHandle,
} from 'react';
import { TextField } from '@mui/material';
import type { TextFieldProps } from '@mui/material';
import type { ForwardRefRenderFunction } from 'react';

export type InputRef = HTMLInputElement & {
  removeErrorMessage: () => void;
  addErrorMessage: (error: string) => void;
};

const Input: ForwardRefRenderFunction<InputRef, TextFieldProps> = (
  { ...rest },
  ref
) => {
  const [error, setErrorState] = useState(false);
  const [helperText, setHelperText] = useState<string | undefined>();

  const textFieldInputRef = useRef<HTMLInputElement>(null);

  const handleAddErrorMessage = useCallback((msg: string) => {
    setErrorState(true);
    setHelperText(msg);
  }, []);

  const handleRemoveErrorMessage = useCallback(() => {
    setErrorState(false);
    setHelperText('');
  }, []);

  useImperativeHandle(ref, () => {
    const input = textFieldInputRef.current;
    if (!input) {
      throw new Error('Input: inputRef is not assigned yet.');
    }

    return Object.assign(input, {
      addErrorMessage: handleAddErrorMessage,
      removeErrorMessage: handleRemoveErrorMessage,
    });
  });

  return (
    <TextField
      {...rest}
      error={error}
      helperText={helperText || ' '}
      inputRef={textFieldInputRef}
    />
  );
};

export default forwardRef<InputRef, TextFieldProps>(Input);
