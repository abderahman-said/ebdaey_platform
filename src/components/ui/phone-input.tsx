import * as React from "react";
import PhoneInput, { getCountryCallingCode, type Country } from "react-phone-number-input";
import flags from "react-phone-number-input/flags";
import "react-phone-number-input/style.css";
import { cn } from "@/lib/utils";

interface PhoneInputFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  /** Restrict the country selector to a specific list (e.g. ["EG"]). */
  countries?: Country[];
}


// Input that enforces a safe maximum while leaving value formatting to
// react-phone-number-input. Mutating only the displayed value breaks its
// internal cursor state and can make backspace restore removed digits.
const MaxLengthInput =
  React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
    (props, ref) => {
      const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const digitsOnly = e.target.value.replace(/\D/g, "");
        if (digitsOnly.length > 20) return;
        props.onChange?.(e);
      };

      return (
        <input
          {...props}
          ref={ref}
          onChange={handleChange}
          maxLength={25}
        />
      );
    },
  );

const PhoneInputField = React.forwardRef<
  HTMLDivElement,
  PhoneInputFieldProps & { compact?: boolean; rootClassName?: string; fixed?: boolean }
>(
  ({ value, onChange, placeholder = "رقم الهاتف", className, required, compact, rootClassName, countries, fixed }, ref) => {
    const [country, setCountry] = React.useState<Country>("EG");

    let callingCode = "";
    try {
      callingCode = "+" + getCountryCallingCode(country);
    } catch {
      callingCode = "";
    }

    return (
      <div
        ref={ref}
        style={{ ["--cc" as any]: `"${callingCode}"` }}
        className={cn(
          "phone-input-wrapper relative flex w-full rounded-xl border border-input bg-card px-3 py-2 ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
          compact ? "phone-input-compact h-10 text-sm" : "h-12 text-base",
          fixed && "phone-input-fixed",
          rootClassName,
          className,
        )}
      >
        <PhoneInput
          international={false}
          defaultCountry="EG"
          flags={flags}
          countryCallingCodeEditable={false}
          countries={countries}
          value={value}
          onChange={(val) => onChange(val || "")}
          onCountryChange={(c) => c && setCountry(c)}
          placeholder={placeholder}
          inputComponent={MaxLengthInput}
          className="flex w-full h-full"
        />

      </div>
    );
  },
);

PhoneInputField.displayName = "PhoneInputField";

export { PhoneInputField };
