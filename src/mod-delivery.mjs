export function handlePhoneDelivery(context, storage, effects, log) {
  if(!context||context.unsupported||!/^phone delivery check$/i.test(context.action))return;
  const {phone,app}=context;
  if(phone.screen!=='app'||!app?.delivery){completePhoneAction(context,storage,effects,log,'Open an app with delivery service first.\n[phone home] Phone home');return;}
  const destination={locationId:context.check({type:'party-location'}),areaId:context.check({type:'party-area'})};
  const result=evaluateAppDeliveryDestination(app,destination);
  completePhoneAction(context,storage,effects,log,app.label.toUpperCase()+' DELIVERY\n'+
    (result.message||'This destination is not excluded. Coverage, opening hours, stock, fees and arrival time still apply.')+
    '\nNo new order has been placed.\n[phone home] Phone home');
}
