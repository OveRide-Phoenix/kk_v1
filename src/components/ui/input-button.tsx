import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface InputWithButtonProps {
  value: number;
  onChange: (newValue: number) => void;
}

export function InputWithButton({ value, onChange }: InputWithButtonProps) {
  const handleDecrement = () => {
    onChange(value - 1);
  };

  const handleIncrement = () => {
    onChange(value + 1);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = parseInt(e.target.value, 10);
    if (!isNaN(parsed)) {
      onChange(parsed);
    } else {
      onChange(0);
    }
  };

  return (
    <div className="flex w-full max-w-sm items-center gap-2">
      <Button type="button" variant="outline" onClick={handleDecrement}>
        –
      </Button>
      <Input
        type="number"
        value={value}
        onChange={handleChange}
        className="text-center"
      />
      <Button type="button" variant="outline" onClick={handleIncrement}>
        +
      </Button>
    </div>
  );
}
