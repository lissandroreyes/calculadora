
import { useEffect } from 'react';

interface Tasa {
  fuente: string;
  promedio: number;
  fechaActualizacion: string;
}

export default function Home() {
  useEffect(() => {
    const f2 = (num: number) => (Math.round((num + Number.EPSILON) * 100) / 100).toFixed(2);

    function formatTime(isoString: string) {
        if (!isoString) return "--:--";
        const date = new Date(isoString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    }

    document.querySelectorAll('[id^="r3_"]').forEach(el => {
        el.addEventListener('input', () => {
            const a = parseFloat((document.getElementById('r3_a') as HTMLInputElement).value);
            const b = parseFloat((document.getElementById('r3_b') as HTMLInputElement).value);
            const c = parseFloat((document.getElementById('r3_c') as HTMLInputElement).value);
            const r3_res = document.getElementById('r3_res') as HTMLInputElement;
            if (r3_res) {
                r3_res.value = (a && b && c) ? f2((c * b) / a) : "";
            }
        });
    });

    async function obtenerTasas() {
        try {
            const [resDolar, resEuro] = await Promise.all([
                fetch("https://ve.dolarapi.com/v1/dolares"),
                fetch("https://ve.dolarapi.com/v1/euros")
            ]);
            if (!resDolar.ok || !resEuro.ok) {
                throw new Error('Network response was not ok');
            }
            const dataDolar: Tasa[] = await resDolar.json();
            const dataEuro: Tasa[] = await resEuro.json();

            const p = dataDolar.find((d: Tasa) => d.fuente === 'paralelo');
            const o = dataDolar.find((d: Tasa) => d.fuente === 'oficial');
            const e = dataEuro.find((d: Tasa) => d.fuente === 'oficial');

            if (p) (document.getElementById('tasaP') as HTMLInputElement).value = f2(p.promedio);
            if (o) (document.getElementById('tasaO') as HTMLInputElement).value = f2(o.promedio);
            if (e) (document.getElementById('tasaE') as HTMLInputElement).value = f2(e.promedio);
            
            const timeP = document.getElementById('timeP');
            if (p && timeP) timeP.innerText = formatTime(p.fechaActualizacion);
            const timeO = document.getElementById('timeO');
            if (o && timeO) timeO.innerText = formatTime(o.fechaActualizacion);
            const timeE = document.getElementById('timeE');
            if (e && timeE) timeE.innerText = formatTime(e.fechaActualizacion);
            
            const apiStatus = document.getElementById('api-status');
            if (apiStatus) {
                apiStatus.innerText = "Tasas actualizadas";
                apiStatus.className = "api-status status-ok";
            }
        } catch (err) {
            const apiStatus = document.getElementById('api-status');
            if (apiStatus) {
                apiStatus.innerText = "Error API - Use manual";
                apiStatus.className = "api-status status-err";
            }
        }
        calcular(true);
    }

    function calcular(porMargen: boolean) {
        const tP = parseFloat((document.getElementById('tasaP') as HTMLInputElement).value) || 0;
        const tO = parseFloat((document.getElementById('tasaO') as HTMLInputElement).value) || 0;
        const tE = parseFloat((document.getElementById('tasaE') as HTMLInputElement).value) || 0;
        const qty = parseFloat((document.getElementById('qty') as HTMLInputElement).value) || 1;
        const monto = parseFloat((document.getElementById('costoMonto') as HTMLInputElement).value) || 0;
        const monedaRadio = document.querySelector('input[name="monedaCompra"]:checked') as HTMLInputElement;
        const moneda = monedaRadio ? monedaRadio.value : 'P';
        const inputMargen = document.getElementById('margen') as HTMLInputElement;
        const inputPVP = document.getElementById('manualPVP') as HTMLInputElement;

        let cB = (moneda === 'P') ? monto * tP : (moneda === 'O') ? monto * tO : (moneda === 'E') ? monto * tE : monto;
        const cU = cB / qty;
        let pvpB = 0, margenF = 0;

        if (porMargen) {
            margenF = parseFloat(inputMargen.value) || 0;
            pvpB = cU / (1 - (margenF / 100));
            if (inputPVP) inputPVP.value = f2(pvpB);
        } else {
            pvpB = parseFloat(inputPVP.value) || 0;
            if (pvpB > 0) {
                margenF = ((pvpB - cU) / pvpB) * 100;
                if (inputMargen) inputMargen.value = f2(margenF);
            }
        }
        actualizarUI(pvpB, tO, tE, cU, margenF);
    }

    function actualizarUI(pvpB: number, tO: number, tE: number, cU: number, m: number) {
        const resCard = document.getElementById('resCard');
        const txtStatus = document.getElementById('txtStatus');
        let color = "#7f8c8d", texto = "Negocio";

        if (m < 0) { color = "#333"; texto = "Pérdida"; }
        else if (m < 5) { color = "var(--baja)"; texto = "Baja"; }
        else if (m < 15) { color = "var(--media)"; texto = "Media"; }
        else if (m < 30) { color = "var(--buena)"; texto = "Buena"; }
        else if (m < 50) { color = "var(--alta)"; texto = "Alta"; }
        else { color = "var(--muyalta)"; texto = "Muy Alta"; }

        if (resCard) resCard.style.backgroundColor = color;
        if (txtStatus) txtStatus.innerText = texto;
        
        const pvpBElement = document.getElementById('pvpB');
        if (pvpBElement) pvpBElement.innerText = parseFloat(f2(pvpB)).toLocaleString('es-VE', {minimumFractionDigits: 2});
        const pvpOElement = document.getElementById('pvpO');
        if (pvpOElement) pvpOElement.innerText = tO > 0 ? f2(pvpB / tO) : "0.00";
        const pvpEElement = document.getElementById('pvpE');
        if (pvpEElement) pvpEElement.innerText = tE > 0 ? f2(pvpB / tE) : "0.00";
        const uCostoElement = document.getElementById('uCosto');
        if (uCostoElement) uCostoElement.innerText = f2(cU);
        const uGananciaElement = document.getElementById('uGanancia');
        if (uGananciaElement) uGananciaElement.innerText = f2(pvpB - cU);
    }

    function convertir(origen: string) {
        const tP = parseFloat((document.getElementById('tasaP') as HTMLInputElement).value) || 0;
        const tO = parseFloat((document.getElementById('tasaO') as HTMLInputElement).value) || 0;
        const tE = parseFloat((document.getElementById('tasaE') as HTMLInputElement).value) || 0;
        const valP = document.getElementById('convP') as HTMLInputElement, 
              valO = document.getElementById('convO') as HTMLInputElement, 
              valE = document.getElementById('convE') as HTMLInputElement, 
              valB = document.getElementById('convB') as HTMLInputElement;

        let mB = 0;
        if (origen === 'P' && valP) mB = parseFloat(valP.value) * tP;
        else if (origen === 'O' && valO) mB = parseFloat(valO.value) * tO;
        else if (origen === 'E' && valE) mB = parseFloat(valE.value) * tE;
        else if (origen === 'B' && valB) mB = parseFloat(valB.value);

        if (origen !== 'B' && valB) valB.value = mB ? f2(mB) : "";
        if (origen !== 'P' && valP) valP.value = (mB && tP) ? f2(mB / tP) : "";
        if (origen !== 'O' && valO) valO.value = (mB && tO) ? f2(mB / tO) : "";
        if (origen !== 'E' && valE) valE.value = (mB && tE) ? f2(mB / tE) : "";
    }

    function actualizarTodo() { 
        calcular(true); 
        convertir('B'); 
    }
    
    const convP = document.getElementById('convP');
    if (convP) convP.addEventListener('input', () => convertir('P'));
    const convO = document.getElementById('convO');
    if (convO) convO.addEventListener('input', () => convertir('O'));
    const convE = document.getElementById('convE');
    if (convE) convE.addEventListener('input', () => convertir('E'));
    const convB = document.getElementById('convB');
    if (convB) convB.addEventListener('input', () => convertir('B'));

    const tasaP = document.getElementById('tasaP');
    if (tasaP) tasaP.addEventListener('input', () => actualizarTodo());
    const tasaO = document.getElementById('tasaO');
    if (tasaO) tasaO.addEventListener('input', () => actualizarTodo());
    const tasaE = document.getElementById('tasaE');
    if (tasaE) tasaE.addEventListener('input', () => actualizarTodo());
    
    const qty = document.getElementById('qty');
    if (qty) qty.addEventListener('input', () => calcular(true));
    const costoMonto = document.getElementById('costoMonto');
    if (costoMonto) costoMonto.addEventListener('input', () => calcular(true));
    
    document.querySelectorAll('input[name="monedaCompra"]').forEach(radio => {
        radio.addEventListener('change', () => calcular(true));
    });

    const margen = document.getElementById('margen');
    if (margen) margen.addEventListener('input', () => calcular(true));
    const manualPVP = document.getElementById('manualPVP');
    if (manualPVP) manualPVP.addEventListener('input', () => calcular(false));


    obtenerTasas();
  }, []);

  return (
    <>
      <style jsx global>{`
        :root {
            --baja: #e74c3c; --media: #f39c12; --buena: #27ae60; --alta: #2ecc71; --muyalta: #1abc9c;
        }
        body { font-family: 'Segoe UI', sans-serif; background-color: #f0f2f5; display: flex; justify-content: center; padding: 20px; }
        .card { background: white; padding: 25px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); width: 100%; max-width: 500px; }
        h2 { color: #1a73e8; margin: 0 0 15px 0; font-size: 1.4rem; text-align: center; }
        .section-title { font-size: 0.75rem; color: #888; text-transform: uppercase; letter-spacing: 1px; margin: 15px 0 10px 0; border-bottom: 1px solid #eee; padding-bottom: 5px; }
        
        .grid-tasas { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
        .tasa-item { display: flex; flex-direction: column; }
        .tasa-time { font-size: 0.6rem; color: #999; margin-top: 3px; text-align: center; font-weight: bold; }
        
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .input-group { margin-bottom: 12px; }
        label { display: block; font-size: 0.75rem; color: #444; margin-bottom: 4px; font-weight: 600; }
        input, select { width: 100%; padding: 8px 10px; border: 2px solid #eee; border-radius: 6px; box-sizing: border-box; font-size: 0.9rem; }
        
        .api-status { padding: 6px; border-radius: 6px; font-size: 0.7rem; margin-bottom: 15px; text-align: center; }
        .status-ok { background: #e6ffed; color: #1e7e34; }
        .status-err { background: #ffebee; color: #c62828; }
        
        .tool-box { background: #f8f9fa; padding: 15px; border-radius: 10px; border: 1px solid #e9ecef; margin: 15px 0; }
        .conv-grid-2x2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

        .r3-container { display: flex; align-items: center; gap: 10px; justify-content: center; }
        .r3-col { display: flex; flex-direction: column; gap: 8px; width: 40%; }
        .r3-res { border: 2px solid #1a73e8 !important; background: #e8f0fe !important; font-weight: bold; color: #1a73e8; }

        .results { background: #1a73e8; color: white; padding: 18px; border-radius: 10px; margin-top: 15px; transition: background 0.4s ease; }
        .res-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .val-big { font-size: 1.4rem; font-weight: bold; }
        .label-status { font-size: 0.75rem; font-weight: bold; text-transform: uppercase; background: rgba(255,255,255,0.2); padding: 2px 8px; border-radius: 4px; }
        
        .detail-box { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 12px; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 12px; }
        .detail-item { background: rgba(255,255,255,0.1); padding: 8px; border-radius: 6px; text-align: center; }
        .detail-item small { display: block; font-size: 0.65rem; text-transform: uppercase; opacity: 0.8; }
        
        .radio-button-group { display: flex; gap: 5px; flex-wrap: wrap; }
        .radio-button-group input[type="radio"] { display: none; }
        .radio-button-group label {
            flex-grow: 1;
            text-align: center;
            padding: 8px 10px;
            border: 2px solid #eee;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.8rem;
            transition: all 0.2s ease;
        }
        .radio-button-group input[type="radio"]:checked + label {
            background-color: #1a73e8;
            color: white;
            border-color: #1a73e8;
        }
      `}</style>
      <div className="card">
        <h2>Calculadora</h2>
        <div id="api-status" className="api-status">Consultando tasas...</div>

        <div className="section-title">Tasas de Cambio</div>
        <div className="grid-tasas">
            <div className="tasa-item">
                <label>P ($)</label>
                <input type="number" id="tasaP" />
                <div id="timeP" className="tasa-time">--:--</div>
            </div>
            <div className="tasa-item">
                <label>O ($)</label>
                <input type="number" id="tasaO" />
                <div id="timeO" className="tasa-time">--:--</div>
            </div>
            <div className="tasa-item">
                <label>Euro (€)</label>
                <input type="number" id="tasaE" />
                <div id="timeE" className="tasa-time">--:--</div>
            </div>
        </div>

        <div className="tool-box">
            <div className="section-title" style={{marginTop:0, border:'none'}}>Conversor</div>
            <div className="conv-grid-2x2">
                <div className="input-group"><label>Monto P ($)</label><input type="number" id="convP" placeholder="0.00" /></div>
                <div className="input-group"><label>Monto O ($)</label><input type="number" id="convO" placeholder="0.00" /></div>
                <div className="input-group"><label>Monto €</label><input type="number" id="convE" placeholder="0.00" /></div>
                <div className="input-group"><label>Monto Bs</label><input type="number" id="convB" placeholder="0.00" /></div>
            </div>
        </div>

        <div className="tool-box">
            <div className="section-title" style={{marginTop:0, border:'none'}}>Regla de Tres</div>
            <div className="r3-container">
                <div className="r3-col">
                    <input type="number" id="r3_a" placeholder="Si A" />
                    <input type="number" id="r3_c" placeholder="Tengo C" />
                </div>
                <div style={{fontWeight: 'bold', color: '#1a73e8'}}>→</div>
                <div className="r3-col">
                    <input type="number" id="r3_b" placeholder="Es B" />
                    <input type="text" id="r3_res" className="r3-res" placeholder="X" readOnly />
                </div>
            </div>
        </div>

        <div className="section-title">Datos de Compra</div>
        <div className="grid-2">
            <div className="input-group"><label>Cant. Unidades:</label><input type="number" id="qty" defaultValue="8" /></div>
            <div className="input-group"><label>Costo Monto:</label><input type="number" id="costoMonto" defaultValue="10" /></div>
        </div>
        <div className="input-group">
            <label>Comprado en:</label>
            <div className="radio-button-group">
                <input type="radio" id="compraP" name="monedaCompra" value="P" defaultChecked />
                <label htmlFor="compraP">Dólar P</label>
                <input type="radio" id="compraO" name="monedaCompra" value="O" />
                <label htmlFor="compraO">Dólar O</label>
                <input type="radio" id="compraE" name="monedaCompra" value="E" />
                <label htmlFor="compraE">Euro (€)</label>
                <input type="radio" id="compraB" name="monedaCompra" value="B" />
                <label htmlFor="compraB">Bolívares</label>
            </div>
        </div>

        <div className="section-title">Margen y Venta</div>
        <div className="grid-2">
            <div className="input-group"><label style={{color:'#1a73e8'}}>Margen %:</label><input type="number" id="margen" defaultValue="30" /></div>
            <div className="input-group"><label style={{color:'#1a73e8'}}>Venta (Bs):</label><input type="number" id="manualPVP" /></div>
        </div>

        <div className="results" id="resCard">
            <div className="res-row">
                <span id="txtStatus" className="label-status">ESPERANDO</span>
                <div style={{textAlign: 'right', lineHeight: 1.2}}>
                    <div style={{fontSize: '0.8rem'}}>$ <span id="pvpO">0.00</span></div>
                    <div style={{fontSize: '0.8rem'}}>€ <span id="pvpE">0.00</span></div>
                </div>
            </div>
            <div className="res-row">
                <span>Sugerido (Bs):</span>
                <span id="pvpB" className="val-big">0.00</span>
            </div>
            <div className="detail-box">
                <div className="detail-item"><small>Costo u:</small><span id="uCosto">0.00</span></div>
                <div className="detail-item"><small>Ganancia u:</small><span id="uGanancia">0.00</span></div>
            </div>
        </div>
      </div>
    </>
  );
}
