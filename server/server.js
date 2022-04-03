// *****************************************************************************
// SSL

// import express from "express";
// import fs from "fs";
// import https from "https";
// import cors from "cors";
// const app = express();
// const PORTS = 2949;
// const WEB = "./";
// let folder = '';
// let files = '';

// app.use(cors());
// app.use(express.static('./', {    // Like "Default Document" on ISS
//   index: ["index.html"]
// }));
// var privateKey = fs.readFileSync('./cert/private.key');
// var certificate = fs.readFileSync('./cert/certificate.crt');

// https.createServer({
//     key: privateKey,
//     cert: certificate
// }, app).listen(PORTS, function() {
//   console.log(`Server listening for https at https://rolandasseputis.lt:${PORTS}/zmones`)
// });
// *****************************************************************************


// *****************************************************************************
// EXPRESS WEBSERVER IMPORT
// MAIN/DEFAULT WEB SERVER PARAMETERS
import express from "express";
const app = express();
const PORT = 2949;    // Sets default website port
app.listen(PORT, () => {
    console.log(`Example app listening at http://localhost:${PORT}`);
});
const WEB = "web";
app.use(express.static(WEB, {    // Like "Default Document" on ISS
    index: ["index.html"]
}));
// *****************************************************************************

// ADDITIONAL WEB SERVER PARAMETERS 
// Suteikia funkcionaluma automatiskai iskaidyti URL'e esancius parametrus
// i atskirus objektus. Visu ju vertes tekstines, todel skaitines reiksmes reikia
// konvertuotis i skaicius.
app.use(express.urlencoded({
    extended: true,
}));

// imports css and other static content such us images, fonts
app.use(express.static('./public'));


// *****************************************************************************
// HANDLEBARS FOR EXPRESS WEB SERVER IMPORT 
import handleBars from "express-handlebars";
// app.engine('handlebars', handleBars()); // DEFAULT
app.engine(
    "handlebars",
    handleBars({
        helpers: {
            dateFormat: (date) => {
                if (date instanceof Date) {
                    let year = "0000" + date.getFullYear();
                    year = year.substr(-4);
                    let month = "00" + (date.getMonth() + 1);
                    month = month.substr(-2);
                    let day = "00" + date.getDate();
                    day = day.substr(-2);
                    return `${year}-${month}-${day}`;
                }
                return date;
            },
            eq: (param1, param2) => {
                return param1 === param2;
            },
        },
    }),
);

app.set('view engine', 'handlebars');
// *****************************************************************************
// MYSQL IMPORT
import { connect, end, query, start, rollback, commit } from "./db.js";
import { dataIsValid, hasSpecChar } from "./serverSideDataValidation.js";

// *****************************************************************************
// DATA VALIDATION IMPORT
// import {dataIsValid} from '../public/js/zmogusDataValidation.js';

// *****************************************************************************
// ***************************** LENTELE ZMONES ********************************
// *****************************************************************************

// VISOS LENTELES SPAUSDINIMAS
app.get("/zmones", async (req, res) => {
    let conn;
    try {
        conn = await connect();
        const { results: zmones } = await query(
            conn,
            `
      select
        id, pavarde, vardas, gim_data, alga
        from zmones
        order by
        pavarde`,
        );
        res.render("zmones", { zmones, visizmonesBtn: true });
    } catch (err) {
        res.render("klaida", { err });
    } finally {
        await end(conn);
    }
});

// VIENO IRASO HTML FORMOS GENERAVIMAS
app.get("/zmogus/:id?", async (req, res) => {
    try {
    // Tikriname ar yra perduotas id parametras.
    // id yra -> senas irasas ir forma uzpildom iraso duomenimis
    // id nera -> naujas irasas, formos laukai pateikiami tusti
    if (req.params.id) {
        const id = parseInt(req.params.id);
        if (!isNaN(id)) { // pasitikrinam ar id yra skaicius ir ar koks internautas neidejo savo tekstinio id
            let conn;
            try {
                conn = await connect();
                const { results: zmogus } = await query(
                    conn,
                    `
        select
            id, pavarde, vardas, gim_data, alga
            from zmones
            where id = ?`,
                    [id],
                );
                if (zmogus.length > 0) {
                    // pasitikrinam ar gavom norima irasa ir jei taip salia formuojam tentele
                    // is susijusios lenteles irasu
                    const { results: adresai } = await query(
                        conn,
                        `
            select
                adresai.id, adresas, miestas, valstybe, pasto_kodas
                from adresai left join zmones on zmones.id = adresai.zmones_id
                where zmones.id = ?
                order by adresas`,
                        [zmogus[0].id],
                    );
                    const { results: kontaktai } = await query(
                        conn,
                        `
            select
                kontaktai.id, tipas, reiksme
                from kontaktai left join zmones on zmones.id = kontaktai.zmones_id
                where zmones.id = ?
                order by tipas`,
                        [zmogus[0].id],
                    );
                    res.render("zmogus", { zmogus: zmogus[0], adresai, kontaktai });
                } else {
                    // Jei pagrindinis irasas nerastas permetam i visu irasu sarasa
                    // o galim parodyt klaidos forma, kad pagal id irasas nerastas
                    throw 'Paglal nurodytą ID įrašas nerastas!';
                    // res.redirect("/zmones");
                }
            } catch (err) {
                // ivyko klaida gaunant duomenis
                res.render("klaida", { err });
            } finally {
                await end(conn);
            }
        } else {
            // Jei id buvo nurodytas ne skaicius permetam i visu irasu sarasa
            // o galim parodyt klaidos forma, kad id negali buti stringas
            throw 'Nurodytas blogas ID. ID negali būti tekstas!';
            // res.redirect("/zmones");
        }
    } else {
        // Jei id nenurodytas vadinasi tai bus
        // naujo iraso ivedimas
        // const active = true;
        res.render("zmogus", {naujaszmogusBtn: true});
    }
}
catch(err) {
    res.render('klaida', { err });
}
});

// IRASO SAUGOJIIMAS
app.post("/zmogus", async (req, res) => {
    try {
    const id = parseInt(req.body.id);
    if (req.body.id) {
        // id yra -> irasa redaguojam
        // id nera -> kuriam nauja irasa
        const {dataIsValidd, alga} = dataIsValid(req.body.vardas, req.body.pavarde, new Date(req.body.gimData), req.body.alga);
        // tikrinam duomenu teisinguma
        if (!isNaN(id) && dataIsValidd) 
        {
            let conn;
            try {
                conn = await connect();
                await start(conn);
                await query(
                    conn,
                    `
                    update zmones
                    set vardas = ? , pavarde = ?, gim_data = ?, alga = ?
                    where id = ?`,
                    [req.body.vardas, req.body.pavarde, new Date(req.body.gimData), alga, id],
                );
                await commit(conn);
            } catch (err) {
                await rollback(conn);
                // ivyko klaida skaitant duomenis is DB
                res.render("klaida", { err });
                return;
            } finally {
                await end(conn);
            }
        } else {
            // res.render('klaida', {  })
            throw 'Blogai nurodyti duomenys';
        }
    } else {
        const {dataIsValidd, alga} = dataIsValid(req.body.vardas, req.body.pavarde, new Date(req.body.gimData), req.body.alga);
        // jei nera id, kuriam nauja irasa
        if (dataIsValidd) {
            let conn;
            try {
                conn = await connect();
                await start(conn);
                await query(
                    conn,
                    `
                    insert into zmones
                    (vardas, pavarde, gim_data, alga)
                    values (?, ?, ?, ?)`,
                    [req.body.vardas, req.body.pavarde, new Date(req.body.gimData), alga],
                );
                await commit(conn);
            } catch (err) {
                await rollback(conn);
                // ivyko klaida irasant duomenis i DB
                res.render("klaida", { err });
                return;
            } finally {
                await end(conn);
            }
        } else {
            throw 'Blogai nurodyti duomenys';
        }
    }
    res.redirect("/zmones");
} catch(err) {
    res.render('klaida', { err });
}
});

// IRASO TRYNIMAS
app.get("/zmogus/:id/del", async (req, res) => {
    const id = parseInt(req.params.id);
    if (!isNaN(id)) {
      let conn;
      try {
        conn = await connect();
        await start(conn);
        await query(
          conn,
          `
            delete from zmones
            where id = ?`,
          [id],
        );
        await commit(conn);
      } catch (err) {
        await rollback(conn);
        // ivyko klaida trinant irasa is DB
        res.render("klaida", { err });
        return;
      } finally {
        await end(conn);
      }
    }
    res.redirect("/zmones");
});

// *****************************************************************************
// **************************** LENTELE ADRESAI ********************************
// *****************************************************************************

// VIENO IRASO HTML FORMOS GENERAVIMAS
app.get("/adresas/:id?", async (req, res) => {
    try {
    // Tikriname ar yra perduotas id parametras.
    // id yra -> senas irasas ir forma uzpildom iraso duomenimis
    // id nera -> naujas irasas, formos laukai pateikiami tusti
    if (req.params.id) {
        const id = parseInt(req.params.id);
        if (!isNaN(id)) { // pasitikrinam ar id yra skaicius ir ar koks internautas neidejo savo tekstinio id
            let conn;
            try {
                conn = await connect();
                const { results: adresas } = await query(
                    conn,
                    `
                    select
                        id, zmones_id, adresas, miestas, valstybe, pasto_kodas
                        from adresai
                        where id = ?`,
                    [id],
                );
                if (adresas.length > 0) {
                    // pasitikrinam ar gavom norima irasa ir jei taip salia formuojam tentele
                    // is susijusios lenteles irasu
                    res.render("adresas", { adresas: adresas[0], adresasBtn: false,  showBtn: true });
                } else {
                    // Jei pagrindinis irasas nerastas permetam i visu irasu sarasa
                    // o galim parodyt klaidos forma, kad pagal id irasas nerastas
                    throw 'Paglal nurodytą ID įrašas nerastas!';
                    // res.redirect("/zmones");
                }
            } catch (err) {
                // ivyko klaida gaunant duomenis
                res.render("klaida", { err });
            } finally {
                await end(conn);
            }
        } else {
            // Jei id buvo nurodytas ne skaicius permetam i visu irasu sarasa
            // o galim parodyt klaidos forma, kad id negali buti stringas
            throw 'Nurodytas blogas ID. ID negali būti tekstas!';
            // res.redirect("/zmones");
        }
    } else {
        const zmogusId = parseInt(req.query.zmogusId);

        // Jei id nenurodytas vadinasi tai bus
        // naujo iraso ivedimas
        res.render("adresas", { zmogusId, adresasBtn: true,  showBtn: true });
    }
} catch(err) {
    res.render('klaida', { err });
}
});

// IRASO SAUGOJIIMAS
app.post("/adresas", async (req, res) => {
    try {
    if (req.body.id) {
        // id yra -> irasa redaguojam
        // id nera -> kuriam nauja irasa
        const id = parseInt(req.body.id);

        if (
            // tikrinam duomenu teisinguma
            !isNaN(id) &&
            typeof req.body.adresas === "string" && req.body.adresas.trim() !== "" &&
            typeof req.body.miestas === "string" && !hasSpecChar(req.body.miestas) &&
            typeof req.body.valstybe === "string" && !hasSpecChar(req.body.valstybe) &&
            typeof req.body.pastoKodas === "string" && req.body.pastoKodas.trim() !== ""
        ) {
            let conn;
            try {
                conn = await connect();
                await start(conn);
                await query(
                    conn,
                    `
                    update adresai
                    set adresas = ? , miestas = ?, valstybe = ?, pasto_kodas = ?
                    where id = ?`,
                    [req.body.adresas, req.body.miestas, req.body.valstybe, req.body.pastoKodas, id],
                );
                await commit(conn);
            } catch (err) {
                await rollback(conn);
                // ivyko klaida skaitant duomenis is DB
                res.render("klaida", { err });
                return;
            } finally {
                await end(conn);
            }
        } else {
            throw 'Blogai nurodyti duomenys';
        }
    } else {
        // jei nera id, kuriam nauja irasa
        const zmogusId = parseInt(req.body.zmogusId);
 
        if (
            !isNaN(zmogusId) &&
            typeof req.body.adresas === "string" && req.body.adresas.trim() !== "" &&
            typeof req.body.miestas === "string" && !hasSpecChar(req.body.miestas) &&
            typeof req.body.valstybe === "string" && !hasSpecChar(req.body.valstybe) &&
            typeof req.body.pastoKodas === "string" && req.body.pastoKodas.trim() !== ""
        ) {
            let conn;
            try {
                conn = await connect();
                await start(conn);
                await query(
                    conn,
                    `
                    insert into adresai
                    (adresas, miestas, valstybe, pasto_kodas, zmones_id)
                    values (?, ?, ?, ?, ?)`,
                    [req.body.adresas, req.body.miestas, req.body.valstybe, req.body.pastoKodas, zmogusId],
                );
                await commit(conn);
            } catch (err) {
                await rollback(conn);
                // ivyko klaida irasant duomenis i DB
                res.render("klaida", { err });
                return;
            } finally {
                await end(conn);
            }
        } else {
            throw 'Blogai nurodyti duomenys';
        }
    }
    res.redirect("/zmogus/" + req.body.zmogusId);
} catch(err) {
    res.render('klaida', { err });
}
});

// IRASO TRYNIMAS
app.get("/adresas/:id/del", async (req, res) => {
    const id = parseInt(req.params.id);
    let zmogusId;
    if (!isNaN(id)) {
      let conn;
      try {
        conn = await connect();
        const { results: adresai } = await query(
          conn,
          `
          select
            zmones_id as zmogusId
          from adresai
          where id = ?`,
          [id],
        );
        if (adresai.length > 0) {
          zmogusId = adresai[0].zmogusId;
          await start(conn);
          await query(
            conn,
            `
              delete from adresai
              where id = ?`,
            [id],
          );
          await commit(conn);
        }
      } catch (err) {
        await rollback(conn);
        // ivyko klaida trinant duomenis
        res.render("klaida", { err });
        return;
      } finally {
        await end(conn);
      }
    }
    if (zmogusId) {
      res.redirect("/zmogus/" + zmogusId);
    } else {
      res.redirect("/zmones");
    }
  });

// *****************************************************************************
// *************************** LENTELE KONTAKTAI *******************************
// *****************************************************************************

// VIENO IRASO HTML FORMOS GENERAVIMAS
app.get("/kontaktas/:id?", async (req, res) => {
    try {
    // Tikriname ar yra perduotas id parametras.
    // id yra -> senas irasas ir forma uzpildom iraso duomenimis
    // id nera -> naujas irasas, formos laukai pateikiami tusti
    if (req.params.id) {
        const id = parseInt(req.params.id);
        if (!isNaN(id)) { // pasitikrinam ar id yra skaicius ir ar koks internautas neidejo savo tekstinio id
            let conn;
            try {
                conn = await connect();
                const { results: kontaktas } = await query(
                    conn,
                    `
                    select
                        id, zmones_id, tipas, reiksme
                        from kontaktai
                        where id = ?`,
                    [id],
                );
                if (kontaktas.length > 0) {
                    // pasitikrinam ar gavom norima irasa ir jei taip salia formuojam tentele
                    // is susijusios lenteles irasu
                    res.render("kontaktas", { kontaktas: kontaktas[0], kontaktasBtn: false,  showBtn: true });
                } else {
                    // Jei pagrindinis irasas nerastas permetam i visu irasu sarasa
                    // o galim parodyt klaidos forma, kad pagal id irasas nerastas
                    throw 'Paglal nurodytą ID įrašas nerastas!';
                    // res.redirect("/zmones");
                }
            } catch (err) {
                // ivyko klaida gaunant duomenis
                res.render("klaida", { err });
            } finally {
                await end(conn);
            }
        } else {
            // Jei id buvo nurodytas ne skaicius permetam i visu irasu sarasa
            // o galim parodyt klaidos forma, kad id negali buti stringas
            throw 'Nurodytas blogas ID. ID negali būti tekstas!';
            // res.redirect("/zmones");
        }
    } else {
        const zmogusId = parseInt(req.query.zmogusId);

        // Jei id nenurodytas vadinasi tai bus
        // naujo iraso ivedimas
        res.render("kontaktas", { zmogusId, kontaktasBtn: true, showBtn: true });
    }
} catch(err) {
    res.render('klaida', { err });
}
});

// IRASO SAUGOJIIMAS
app.post("/kontaktas", async (req, res) => {
    if (req.body.id) {
        // id yra -> irasa redaguojam
        // id nera -> kuriam nauja irasa
        const id = parseInt(req.body.id);

        if (
            // tikrinam duomenu teisinguma
            !isNaN(id) &&
            typeof req.body.tipas === "string" &&
            req.body.tipas.trim() !== "" &&
            typeof req.body.reiksme === "string" &&
            req.body.reiksme.trim() !== ""
        ) {
            let conn;
            try {
                conn = await connect();
                await start(conn);
                await query(
                    conn,
                    `
                    update kontaktai
                    set tipas = ? , reiksme = ?
                    where id = ?`,
                    [req.body.tipas, req.body.reiksme, id],
                );
                await commit(conn);
            } catch (err) {
                await rollback(conn);
                // ivyko klaida skaitant duomenis is DB
                res.render("klaida", { err });
                return;
            } finally {
                await end(conn);
            }
        } 
    } else {
        // jei nera id, kuriam nauja irasa
        const zmogusId = parseInt(req.body.zmogusId);
 
        if (
            !isNaN(zmogusId) &&
            typeof req.body.tipas === "string" &&
            req.body.tipas.trim() !== "" &&
            typeof req.body.reiksme === "string" &&
            req.body.reiksme.trim() !== ""
        ) {
            let conn;
            try {
                conn = await connect();
                await start(conn);
                await query(
                    conn,
                    `
                    insert into kontaktai
                    (tipas, reiksme, zmones_id)
                    values (?, ?, ?)`,
                    [req.body.tipas, req.body.reiksme, zmogusId],
                );
                await commit(conn);
            } catch (err) {
                await rollback(conn);
                // ivyko klaida irasant duomenis i DB
                res.render("klaida", { err });
                return;
            } finally {
                await end(conn);
            }
        }
    }
    res.redirect("/zmogus/" + req.body.zmogusId);
});

// IRASO TRYNIMAS
app.get("/kontaktas/:id/del", async (req, res) => {
    const id = parseInt(req.params.id);
    let zmogusId;
    if (!isNaN(id)) {
      let conn;
      try {
        conn = await connect();
        const { results: kontaktai } = await query(
          conn,
          `
          select
            zmones_id as zmogusId
          from kontaktai
          where id = ?`,
          [id],
        );
        if (kontaktai.length > 0) {
          zmogusId = kontaktai[0].zmogusId;
          await start(conn);
          await query(
            conn,
            `
              delete from kontaktai
              where id = ?`,
            [id],
          );
          await commit(conn);
        }
      } catch (err) {
        await rollback(conn);
        // ivyko klaida trinant duomenis
        res.render("klaida", { err });
        return;
      } finally {
        await end(conn);
      }
    }
    if (zmogusId) {
      res.redirect("/zmogus/" + zmogusId);
    } else {
      res.redirect("/zmones");
    }
  });

// *****************************************************************************
// ****************************** ATASKAITOS ***********************************
// *****************************************************************************

// ZMONES PAGAL MIESTUS
  app.use("/report/pagalMiestus", async (req, res) => {
    let conn;
    try {
      conn = await connect();
      const { results: ataskaita } = await query(
        conn,
        `
        SELECT miestas, count(*) as viso
            FROM zmones left join adresai on zmones.id = adresai.zmones_id
            group by miestas`
      );
      res.render("reports/pagalMiestus", { ataskaita, pagalmiestusBtn: true });
    } catch (err) {
      res.render("klaida", { err });
    } finally {
      await end(conn);
    }
  });
  
// TOP 3 ATLYGINIMAI
app.use("/report/topAtlyginimai", async (req, res) => {
    let conn;
    try {
      conn = await connect();
      const { results: ataskaita } = await query(
        conn,
        `
        SELECT vardas, pavarde, gim_data, alga 
            FROM zmones
            order by alga desc limit 3`
      );
      console.log(ataskaita);
      res.render("reports/topAtlyginimai", { ataskaita, top3Btn: true });
    } catch (err) {
      res.render("klaida", { err });
    } finally {
      await end(conn);
    }
  });
  
// PAGAL GIMIMO DATA
app.use("/report/pagalGimData", async (req, res) => {
    let nuo = new Date(req.body.nuo);
    if (isNaN(nuo.getTime())) {
      nuo = new Date("0001-01-01");
    }
    let iki = new Date(req.body.iki);
    if (isNaN(iki.getTime())) {
      iki = new Date("9999-12-31");
    }
    let conn;
    try {
      conn = await connect();
      const { results: ataskaita } = await query(
        conn,
        `
        SELECT vardas, pavarde, gim_data, alga 
            FROM zmones
            where gim_data >= ? and gim_data <= ?
            order by gim_data`,
        [nuo, iki],
      );
      res.render("reports/pagalGimData", { ataskaita, nuo, iki, pagaldataBtn: true });
    } catch (err) {
      res.render("klaida", { err });
    } finally {
      await end(conn);
    }
  });
  