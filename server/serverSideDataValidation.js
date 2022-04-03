// *****************************************************************************
// SERVER SIDE DATA VALIDATION
// *****************************************************************************

function dataIsValid(vardas, pavarde, gimData, alga) {
    // const vardas = req.body.vardas;
    // const pavarde = req.body.pavarde;
    // const alga = req.body.alga;
    let algaFieldIsValid = true;

    const specChars = /[!"#$%&'()*+,-./0123456789:;<=>?@[\]^_`{|}~€‚„†‡‰‹¨ˇ¸‘’“”•–—™›¯˛¢£¤¦§Ø©Ŗ«¬®Æ°±²³´µ¶·ø¹ŗ»¼½¾æ÷˙]/;

    const textFieldsAreValid = !specChars.test(vardas) && !specChars.test(pavarde) &&
        (typeof vardas === 'string') && vardas.trim() !== '' &&
        (typeof pavarde === 'string') && pavarde.trim() !== '' &&
        isFinite(gimData.getTime());

    if (alga) {
        if (!isFinite(alga) || alga < 0) algaFieldIsValid = false;
    } else {
        alga = null;
    }

    // console.log('-------------')
    // console.log('TEXT FIELDS ', textFieldsAreValid);
    // console.log('algaisvalid', algaFieldIsValid, alga);
    // console.log('vardas ', vardas, typeof vardas==='string', vardas.trim() !=='', !specChars.test(vardas));
    // console.log('pavarde ', pavarde, typeof pavarde==='string', pavarde.trim() !=='', !specChars.test(pavarde));
    // console.log('alga ', alga, isFinite(alga), alga <0);
    // console.log('----------')

    return {dataIsValidd: textFieldsAreValid && algaFieldIsValid, alga: alga};
}

function hasSpecChar(field) {
    // functions checks is string has any unallowed characters from specChars list
    const specChars = /[!"#$%&'()*+,-./0123456789:;<=>?@[\]^_`{|}~€‚„†‡‰‹¨ˇ¸‘’“”•–—™›¯˛¢£¤¦§Ø©Ŗ«¬®Æ°±²³´µ¶·ø¹ŗ»¼½¾æ÷˙]/;

    return (specChars.test(field) || field.trim() === '')
}

export { dataIsValid, hasSpecChar };