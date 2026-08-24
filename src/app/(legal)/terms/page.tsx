import type { Metadata } from "next";
import Link from "next/link";

import {
  Detail,
  LegalList,
  LegalPage,
  LegalSection,
} from "@/components/legal-page";
import { LEGAL_DETAILS } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Podmienky používania · Prajem si..",
  description:
    "Za akých podmienok sa dá appka používať, čo od nej čakať a čo nie.",
};

/**
 * Public on purpose — see `isPublic` in src/proxy.ts.
 *
 * The limits stated here are the ones the code actually has, including the three
 * ways the surprise can be spoiled. Naming them is deliberate: a promise this
 * app cannot keep would be worse than the admission.
 * docs/decisions/privacy-rule.md
 */
export default function TermsPage() {
  return (
    <LegalPage title="Podmienky používania">
      <LegalSection title="O čom to je">
        <p>
          „Prajem si..“ je appka na zoznamy želaní pre rodinu, tím alebo partiu
          priateľov. Každý si zapíše, čo by chcel; ostatní môžu potichu vybrať
          darček a majiteľ zoznamu sa to nedozvie.
        </p>
        <p>
          Prevádzkuje ju <Detail of={LEGAL_DETAILS.operatorName} />,{" "}
          <Detail of={LEGAL_DETAILS.operatorAddress} />, kontakt{" "}
          <Detail of={LEGAL_DETAILS.contactEmail} />. Používanie je bezplatné a
          nekomerčné. Používaním appky súhlasíš s týmito podmienkami.
        </p>
      </LegalSection>

      <LegalSection title="Účet">
        <p>
          Prihlásiť sa dá jedine cez Google — iná cesta dovnútra neexistuje. Za
          svoj Google účet a za to, kto sa k nemu dostane, zodpovedáš ty.
        </p>
        <p>
          Účet, ktorý nie je v žiadnej skupine, je bežný stav. Nemusíš sa nikam
          hlásiť, kým ťa niekto nepozve alebo kým si skupinu nevytvoríš sám.
        </p>
      </LegalSection>

      <LegalSection title="Skupiny a pozvánky">
        <LegalList>
          <li>
            <strong>Pozvánkový odkaz je kľúč.</strong> Kto ho otvorí, ten sa do
            skupiny pridá — a tým získa prístup ku všetkým želaniam v nej.
            Posielaj ho len ľuďom, ktorých tam chceš mať.
          </li>
          <li>Odkaz platí 24 hodín a vytvoriť ho môže iba správca skupiny.</li>
          <li>Jeden účet môže vytvoriť najviac päť skupín.</li>
          <li>
            <strong>Zo skupiny sa nedá odísť sám.</strong> Jediná cesta von je
            požiadať správcu, aby ťa odobral.
          </li>
          <li>
            Skupina má vždy aspoň jedného správcu a ktorýkoľvek správca ju môže
            zmazať.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection title="Čo do appky píšeš a nahrávaš">
        <p>
          Za názvy, popisy, odkazy a fotky, ktoré pridáš, zodpovedáš ty. K fotke
          musíš mať právo ju použiť. Fotka smie mať najviac 2 MB a formát WebP,
          JPEG alebo PNG.
        </p>
        <p>
          Nepridávaj nič nezákonné, urážlivé ani nič, čo zasahuje do práv iných.
          Obsah, ktorý toto poruší, môžeme odstrániť.
        </p>
      </LegalSection>

      <LegalSection title="Tajomstvo rezervácií a jeho hranice">
        <p>
          Vo svojom zozname nikdy neuvidíš, kto ti čo rezervoval. Tajomstvo
          skončí jedine tak, že ten, kto darček kúpil, sám označí, že ti ho
          odovzdal. Nerobí to za neho žiadny termín ani prevádzkovateľ.
        </p>
        <p>Tri veci to však prezradiť dokážu a je poctivé ich pomenovať:</p>
        <LegalList>
          <li>
            Rezervované želanie sa nedá zmazať ani upraviť — kto sa o to pokúsi
            pri všetkých svojich želaniach, zistí, ktoré sú obsadené. (Appka
            nikdy neprezradí <em>kým</em>.)
          </li>
          <li>
            Ten, kto darček kúpil, môže prekvapenie pokaziť sám tým, že stlačí{" "}
            <em>Darované</em> priskoro.
          </li>
          <li>
            Odobranie člena zo skupiny potichu uvoľní všetky rezervácie, ktoré
            držal.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection title="História darov">
        <p>
          Označenie „darované“ je nevratné. Vznikne z neho nemenný záznam, ktorý
          si mená a text želania odkladá ako kópiu, takže zostane čitateľný aj
          keď jeden z vás zo skupiny odíde, keď sa skupina zmaže alebo keď si
          niekto zruší účet. Vrátiť sa to nedá.
        </p>
      </LegalSection>

      <LegalSection title="Dostupnosť a záruka">
        <p>
          Appka je projekt jedného človeka, beží na bezplatných službách a
          spravuje sa ručne. Nie je za ňou tím, nočná pohotovosť ani podporná
          linka.
        </p>
        <p>
          Poskytuje sa <strong>„tak ako je“</strong>, bez záruky nepretržitej
          dostupnosti. Môže sa stať, že bude chvíľu nedostupná, že sa niečo
          pokazí alebo že jej prevádzka raz skončí. Zálohuj si to, na čom ti
          záleží.
        </p>
      </LegalSection>

      <LegalSection title="Obmedzenie zodpovednosti">
        <p>
          V rozsahu, ktorý slovenské právo dovoľuje, prevádzkovateľ nezodpovedá
          za škodu z používania appky — vrátane nedostupnosti, straty údajov,
          prezradeného prekvapenia alebo darčeka, ktorý si kúpili dvaja.
        </p>
      </LegalSection>

      <LegalSection title="Ukončenie">
        <p>
          Zrušenie účtu si môžeš vyžiadať na{" "}
          <Detail of={LEGAL_DETAILS.contactEmail} />. Podrobnosti o tom, čo sa
          pri ňom zmaže a čo zostane, sú v{" "}
          <Link
            href="/privacy"
            className="text-primary underline underline-offset-4"
          >
            Ochrane osobných údajov
          </Link>
          .
        </p>
        <p>
          Účet, ktorý tieto podmienky porušuje, môže prevádzkovateľ odstrániť.
        </p>
      </LegalSection>

      <LegalSection title="Zmeny podmienok">
        <p>
          Podmienky sa môžu zmeniť; platí vždy verzia na tejto stránke a dátum
          účinnosti hore. Podstatnú zmenu oznámime aj v appke.
        </p>
      </LegalSection>

      <LegalSection title="Rozhodné právo">
        <p>
          Vzťah sa riadi právom Slovenskej republiky. Na spory sú príslušné súdy{" "}
          <Detail of={LEGAL_DETAILS.courtVenue} />.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
