defmodule ZkArcade.NumberDisplay do
  def convert_number_to_shorthand(number) when number >= 1_000_000_000 do
    formatted_number = Float.round(number / 1_000_000_000, 2)
    "#{remove_trailing_zeros(formatted_number)}B"
  end

  def convert_number_to_shorthand(number) when number >= 1_000_000 do
    formatted_number = Float.round(number / 1_000_000, 2)
    "#{remove_trailing_zeros(formatted_number)}M"
  end

  def convert_number_to_shorthand(number) when number >= 1_000 do
    "#{div(number, 1_000)}k"
  end

  def convert_number_to_shorthand(number) when number >= 0 do
    "#{number}"
  end

  def convert_number_to_shorthand(_number), do: "Invalid number"

  defp remove_trailing_zeros(number) do
    if Float.ceil(number) == Float.floor(number) do
      Integer.to_string(trunc(number))
    else
      Float.to_string(Float.round(number, 2))
    end
  end
end
