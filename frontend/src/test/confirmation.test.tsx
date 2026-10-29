import { it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useConfirmation } from "../useConfirmation";
import { Modal } from "../ui";

it("fechar a confirmação com Escape cancela a ação e mantém o modal original aberto", async () => {
  const completed = vi.fn(),
    outerClose = vi.fn();
  function Harness() {
    const { confirm, confirmationModal } = useConfirmation();
    return (
      <Modal title="Editar receita" onClose={outerClose}>
        {confirmationModal}
        <button
          onClick={async () =>
            completed(await confirm("Eliminar esta receita?"))
          }
        >
          Eliminar
        </button>
      </Modal>
    );
  }
  render(<Harness />);
  await userEvent
    .setup()
    .click(screen.getByRole("button", { name: "Eliminar" }));
  const confirmation = await screen.findByRole("dialog", {
    name: "Confirmar ação",
  });
  fireEvent(
    confirmation,
    new Event("cancel", { bubbles: true, cancelable: true }),
  );
  await waitFor(() => expect(completed).toHaveBeenCalledWith(false));
  expect(outerClose).not.toHaveBeenCalled();
  expect(screen.getByRole("dialog", { name: "Editar receita" })).toBeDefined();
});
