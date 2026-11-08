import {useState} from 'react';
import {useUsage} from '../context/UsageContext';
import './UsagePrivacy.css';
export function UsagePrivacy(){
  const {preference,loading,error,visible,pendingWithdrawal,choose,refresh}=useUsage();
  const [confirmation,setConfirmation]=useState(false);
  if(!visible)return null;
  return <section className="usage-privacy" aria-labelledby="usage-privacy-title">
    <span className="usage-privacy-eyebrow">Sua privacidade</span>
    <h3 id="usage-privacy-title">Dados de uso do aplicativo</h3>
    <p>Você escolhe se deseja compartilhar suas telas visitadas e interações com conteúdos para ajudar sua igreja a melhorar o aplicativo. As análises são agregadas, com proteção para grupos pequenos.</p>
    <p>Esses registros também ajudam a entender o primeiro uso medido, as interações úteis e o retorno ao aplicativo. Primeiro uso medido não significa primeiro login da conta.</p>
    <p>Não coletamos o texto das suas anotações, pedidos de oração, atendimentos ou informações de pagamento nesta medição. Você pode continuar usando o app sem autorizar.</p>
    {preference&&!preference.eligible&&<p className="usage-privacy-note">A medição opcional está disponível somente para adultos com data de nascimento informada no cadastro.</p>}
    {preference&&!preference.collection_enabled&&<p className="usage-privacy-note">A igreja pausou esta medição. Sua escolha permanece registrada e pode ser retirada a qualquer momento.</p>}
    {(preference?.eligible||preference?.allowed||pendingWithdrawal)&&<>
      {pendingWithdrawal&&<p role="status" className="usage-privacy-note">A coleta já foi interrompida neste dispositivo. Conclua a desativação online para remover os registros no servidor e confirmar sua escolha nas outras sessões.</p>}
      <p className="usage-privacy-note">{preference?.allowed?(preference.eligible?'Compartilhamento autorizado.':'Coleta indisponível por elegibilidade. Você pode remover a autorização anterior.'):'Compartilhamento desativado.'} As interações desta medição têm retenção de 90 dias e limpeza automática recorrente. Ao desativar, os registros vinculados a esta autorização são removidos; registros operacionais da igreja seguem suas próprias regras.</p>
      {!preference?.allowed&&!pendingWithdrawal&&<label className="usage-privacy-choice"><input type="checkbox" checked={confirmation} onChange={e=>setConfirmation(e.target.checked)}/>Autorizo a medição de uso descrita acima, para melhorar a experiência digital da minha igreja.</label>}
      <button type="button" className={preference?.allowed||pendingWithdrawal?'usage-privacy-secondary':'usage-privacy-primary'} disabled={loading||(!preference?.allowed&&!pendingWithdrawal&&!confirmation)} onClick={()=>void choose(pendingWithdrawal?false:!preference?.allowed).then(()=>setConfirmation(false)).catch(()=>{})}>
        {loading?'Salvando…':pendingWithdrawal?'Concluir desativação':preference?.allowed?'Desativar e remover dados de uso':'Autorizar dados de uso'}
      </button>
    </>}
    {!preference&&!error&&<p role="status">Consultando sua preferência…</p>}
    {error&&<div role="alert"><p>{error}</p><button type="button" className="usage-privacy-secondary" onClick={refresh}>Tentar novamente</button></div>}
    <details className="usage-privacy-policy"><summary>Como esta autorização funciona</summary><p>Esta escolha vale para a medição de uso do PWA da sua igreja e é separada do cadastro, das presenças e dos demais registros operacionais. A Faith Hubs processa as interações para apresentar análises agregadas aos responsáveis autorizados da igreja. Você pode retirar sua autorização aqui, sem perder acesso ao aplicativo. Para outros pedidos sobre seus dados, procure a administração da sua igreja.</p></details>
  </section>;
}
