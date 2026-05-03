import type { ForwardRefRenderFunction } from 'react';
import { useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { IconButton } from '@mui/material';
import type { TextFieldProps } from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

import Input from './Input';
import type { InputRef } from './Input';

const PasswordInput: ForwardRefRenderFunction<InputRef, TextFieldProps> = (
  { ...rest },
  ref
) => {
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const inputRef = useRef<InputRef>(null);

  useImperativeHandle(
    ref,
    () => {
      if (!inputRef.current) {
        throw new Error('PasswordInput: inputRef is not assigned yet.');
      }
      return inputRef.current;
    },
    []
  );

  return (
    <Input
      {...rest}
      ref={inputRef}
      type={showPassword ? 'text' : 'password'}
      placeholder="Password"
      slotProps={{
        input: {
          endAdornment: (
            <IconButton onClick={() => setShowPassword((prev) => !prev)}>
              {showPassword ? (
                <VisibilityOff fontSize="small" />
              ) : (
                <Visibility fontSize="small" />
              )}
            </IconButton>
          ),
        },
      }}
    />
  );
};

export default forwardRef<InputRef, TextFieldProps>(PasswordInput);
