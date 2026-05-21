import React from "react";
import { Field } from "../../components/Field";
import { inputClass } from "../../components/Input";
import { CalendarDatePicker } from "./CalendarDatePicker";
import { PROVINCES } from "../../config/constants";
import { Ticket } from "../../types/domain";

interface TicketFormProps {
  ticket: Ticket;
  onChange: (field: keyof Ticket, value: string) => void;
}

export const TicketForm: React.FC<TicketFormProps> = ({ ticket, onChange }) => {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tỉnh / đài">
          <input
            list="province-options"
            value={ticket.province}
            onChange={(e) => onChange("province", e.target.value)}
            placeholder="VD: Quảng Ngãi"
            className={inputClass}
          />
          <datalist id="province-options">
            {PROVINCES.map((prov) => (
              <option key={prov} value={prov} />
            ))}
          </datalist>
        </Field>
        <Field label="Ngày xổ">
          <CalendarDatePicker
            value={ticket.drawDate}
            onChange={(val) => onChange("drawDate", val)}
          />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Số vé">
          <input
            value={ticket.ticketNumber}
            onChange={(e) => onChange("ticketNumber", e.target.value)}
            placeholder="VD: 456789"
            className={inputClass}
          />
        </Field>
        <Field label="Seri / ký hiệu">
          <input
            value={ticket.series || ""}
            onChange={(e) => onChange("series", e.target.value)}
            placeholder="Không bắt buộc"
            className={inputClass}
          />
        </Field>
      </div>
    </>
  );
};