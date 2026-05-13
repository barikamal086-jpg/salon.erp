import { DIAS_HISTORICO } from '../utils/constants.js';

export function SeletorData({ data, onChange }) {
  const hoje = new Date().toISOString().split('T')[0];
  const minDate = new Date();
  minDate.setDate(minDate.getDate() - DIAS_HISTORICO);
  const minDateStr = minDate.toISOString().split('T')[0];

  return (
    <div className="seletor-data">
      <input
        type="date"
        value={data}
        onChange={(e) => onChange(e.target.value)}
        min={minDateStr}
        max={hoje}
      />
      <span className="data-label">
        {formatarDataBR(data)}
      </span>
    </div>
  );
}

function formatarDataBR(data) {
  const [ano, mes, dia] = data.split('-');
  return `${dia}/${mes}/${ano}`;
}
