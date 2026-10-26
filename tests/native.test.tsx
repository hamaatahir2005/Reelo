import { jest, test, expect } from "@jest/globals";
import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { Button, Field, Label } from "../apps/mobile/src/ui";
let mockDir = "ltr";
jest.mock("../apps/mobile/src/lib/store", () => ({
  usePreferences: (selector: (s: unknown) => unknown) =>
    selector({ theme: "dark" }),
}));
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { dir: () => mockDir },
  }),
}));
jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: jest.requireActual<{ View: unknown }>("react-native").View,
}));
test("accessible action works and disabled action does not fire", () => {
  const press = jest.fn();
  const q = render(<Button title="Send" onPress={press} />);
  fireEvent.press(q.getByRole("button", { name: "Send" }));
  expect(press).toHaveBeenCalledTimes(1);
  q.rerender(<Button title="Send" onPress={press} disabled />);
  fireEvent.press(q.getByRole("button", { name: "Send" }));
  expect(press).toHaveBeenCalledTimes(1);
});
test("fields receive edits and Arabic script uses RTL alignment", () => {
  mockDir = "rtl";
  const edit = jest.fn();
  const q = render(
    <>
      <Label>سڵاو</Label>
      <Field accessibilityLabel="پەیام" value="" onChangeText={edit} />
    </>,
  );
  fireEvent.changeText(q.getByLabelText("پەیام"), "ڕێڵۆ");
  expect(edit).toHaveBeenCalledWith("ڕێڵۆ");
  expect(q.getByText("سڵاو").props.style).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ writingDirection: "rtl", textAlign: "right" }),
    ]),
  );
  mockDir = "ltr";
});
