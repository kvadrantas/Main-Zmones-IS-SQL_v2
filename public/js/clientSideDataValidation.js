// *****************************************************************************
// CLIENT SIDE DATA VALIDATION
// *****************************************************************************

function hasSpecChar(id, name) {
    // functions checks is string has any unallowed characters from specChars list
    const field = document.getElementById(id).value;
    const specChars = /[!"#$%&'()*+,-./0123456789:;<=>?@[\]^_`{|}~€‚„†‡‰‹¨ˇ¸‘’“”•–—™›¯˛¢£¤¦§Ø©Ŗ«¬®Æ°±²³´µ¶·ø¹ŗ»¼½¾æ÷˙]/;

    if (specChars.test(field) || field.trim() === '') alert(`${name} negali būti tuščias(tuščia) arba turėti spec simbolių ar skaičių!`);
}

function checkAlga() {
    const alga = document.getElementById('alga').value;
    if (alga) {
        if (!isFinite(alga) || alga < 0) alert('Alga negali būti neigiama arba begalinė');
    }
}
