import type { Metadata } from "next";

import {
  Doplnit,
  Kod,
  LegalList,
  LegalPage,
  LegalSection,
} from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Ochrana osobných údajov · Prajem si..",
  description: "Aké údaje o tebe appka ukladá, prečo, kto ich vidí a ako dlho.",
};

/**
 * Public on purpose — see `isPublic` in src/proxy.ts. Google's OAuth review
 * fetches this URL while signed out, and so does anybody deciding whether to
 * sign in at all.
 *
 * Everything stated here is checkable against the code: the schema in
 * supabase/migrations/, the OAuth call in src/app/actions/auth.ts and the bucket
 * settings in supabase/config.toml. If one of those changes, this page is part
 * of the change.
 */
export default function PrivacyPage() {
  return (
    <LegalPage title="Ochrana osobných údajov">
      <LegalSection title="Kto tvoje údaje spracúva">
        <p>
          Prevádzkovateľom je <Doplnit>meno alebo názov</Doplnit>,{" "}
          <Doplnit>adresa</Doplnit>. Napísať sa dá na{" "}
          <Doplnit>kontaktný e-mail</Doplnit> — je to jediná adresa, na ktorej
          sa o týchto údajoch dá čokoľvek vyriešiť.
        </p>
        <p>
          Appka je nekomerčný projekt jedného človeka. Nepredáva sa v nej nič,
          nič sa neinzeruje a žiadne údaje sa nikomu nepredávajú.
        </p>
      </LegalSection>

      <LegalSection title="Čo o tebe ukladáme">
        <LegalList>
          <li>
            <strong>Účet</strong> — e-mailová adresa a meno z tvojho Google
            účtu. Pri prihlásení žiadame od Googlu len rozsah{" "}
            <Kod>openid email profile</Kod>. Profilovú fotku z Googlu nečítame
            ani neukladáme.
          </li>
          <li>
            <strong>Meno a rola v skupine</strong> — v každej skupine môžeš mať
            iné meno — „Miro“ pre rodinu, „Miroslav“ pre kolegov. Rola je{" "}
            <em>správca</em> alebo <em>člen</em>.
          </li>
          <li>
            <strong>Skupiny</strong> — ktoré si vytvoril a do ktorých patríš.
          </li>
          <li>
            <strong>Želania</strong> — názov, popis, odkaz a nepovinná fotka,
            plus to, ktorým tvojim skupinám je želanie viditeľné.
          </li>
          <li>
            <strong>Rezervácie</strong> — kto ktoré želanie rezervoval a kedy.
          </li>
          <li>
            <strong>História darov</strong> — po odovzdaní darčeka vzniká záznam
            s kópiou mien oboch strán, názvu a popisu želania, odkazu a názvov
            skupín.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection title="Čo neukladáme">
        <p>
          Žiadne platobné údaje, telefónne čísla ani adresy. Žiadna analytika,
          žiadne meranie návštevnosti, žiadne sledovanie chýb a žiadne reklamné
          ani sledovacie cookies. Appka neposiela nikomu žiadne e-maily.
        </p>
        <p>
          Fotky sa zmenšujú a prekódujú do formátu WebP{" "}
          <strong>ešte v tvojom prehliadači</strong>, čím sa zahodia aj údaje o
          polohe (EXIF GPS), ktoré telefón do fotky zapisuje. Na server tak
          odchádza fotka bez nich.
        </p>
      </LegalSection>

      <LegalSection title="Prečo ich spracúvame">
        <LegalList>
          <li>
            <strong>Plnenie zmluvy</strong> (čl. 6 ods. 1 písm. b GDPR) — účet,
            členstvá, želania a rezervácie. Bez nich appka nevie robiť to, na čo
            si ju otvoril.
          </li>
          <li>
            <strong>Oprávnený záujem</strong> (čl. 6 ods. 1 písm. f GDPR) —
            nemenná história darov. Záujem je na strane druhého účastníka: jeho
            záznam nemá zmiznúť preto, že ty odídeš.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection title="Kto tvoje údaje vidí">
        <p>
          Tvoje želanie vidia iba členovia tých skupín, ktorým si ho priradil.
          Skupiny sa nedajú vyhľadať ani do nich požiadať o vstup — dostaneš sa
          do nej jedine cez pozvánkový odkaz.
        </p>
        <p>
          <strong>
            Kto ti rezervoval želanie, sa z appky nedozvieš — nikdy a nikde.
          </strong>{" "}
          Vo svojom vlastnom zozname rezervácie nevidíš. Tajomstvo skončí až vo
          chvíli, keď ten, kto darček kúpil, sám označí, že ti ho odovzdal.
        </p>
        <p>
          Prevádzkovateľ má z technických dôvodov prístup k databáze a k
          uloženým fotkám. Do údajov nazerá len vtedy, keď treba opraviť
          poruchu.
        </p>
      </LegalSection>

      <LegalSection title="Komu ich ďalej zverujeme">
        <LegalList>
          <li>
            <strong>Vercel</strong> — prevádzka a doručovanie appky.
          </li>
          <li>
            <strong>Supabase</strong> — databáza, prihlasovanie, úložisko fotiek
            a rozposielanie signálu „niečo sa zmenilo“.
          </li>
          <li>
            <strong>Google</strong> — prihlasovanie. Google sám spracúva tvoje
            údaje podľa vlastných pravidiel.
          </li>
        </LegalList>
        <p>
          Región serverov a právny základ prípadného prenosu mimo EÚ:{" "}
          <Doplnit>región a mechanizmus prenosu</Doplnit>.
        </p>
      </LegalSection>

      <LegalSection title="Cookies a lokálne úložisko">
        <p>
          Všetko nižšie je nevyhnutné na fungovanie appky — preto tu nie je
          žiadna lišta so súhlasom. Nič z toho ťa nesleduje.
        </p>
        <LegalList>
          <li>
            <Kod>sb-*-auth-token*</Kod> a <Kod>sb-*-code-verifier</Kod> — tvoje
            prihlásenie a bezpečné dokončenie prihlasovania cez Google.
            Prístupový token platí hodinu a obnovuje sa počas používania.
          </li>
          <li>
            <Kod>wishlist-return-to</Kod> — desať minút, neprístupné
            JavaScriptu. Prenesie otvorenú pozvánku cez prihlásenie a hneď po
            použití sa maže. Pozvánka takto neprechádza Googlom.
          </li>
          <li>
            <Kod>install_prompt_dismissed</Kod> v lokálnom úložisku — pamätá si,
            že si ponuku „pridať na plochu“ odmietol.
          </li>
        </LegalList>
        <p>
          Prihlásenie sa odbavuje celé na serveri, takže v lokálnom úložisku
          prehliadača nikdy neskončí žiadna prihlasovacia session.
        </p>
      </LegalSection>

      <LegalSection title="Ako dlho ich uchovávame">
        <p>
          Účet, členstvá, želania a fotky uchovávame, kým máš účet. Po jeho
          zrušení sa mažú.
        </p>
        <p>
          <strong>Výnimkou je história darov.</strong> Záznam o odovzdanom
          darčeku je nemenný a uchováva sa natrvalo, aj po zrušení účtu: väzba
          na účet sa odstráni, ale mená oboch strán, názov a popis želania,
          odkaz a názvy skupín v ňom zostávajú, pretože boli do záznamu
          skopírované v čase odovzdania. Je to zámer — inak by odchod jedného
          človeka zmazal spoločnú históriu aj druhému. Vrátiť sa to nedá.
        </p>
      </LegalSection>

      <LegalSection title="Tvoje práva">
        <p>
          Máš právo na prístup k svojim údajom, na ich opravu a vymazanie, na
          prenosnosť, na obmedzenie spracúvania a právo namietať proti
          spracúvaniu na základe oprávneného záujmu.
        </p>
        <LegalList>
          <li>
            <strong>Oprava</strong> — meno v skupine si zmeníš priamo v appke.
          </li>
          <li>
            <strong>Vymazanie a všetko ostatné</strong> — napíš na{" "}
            <Doplnit>kontaktný e-mail</Doplnit>. Appka nemá tlačidlo na zrušenie
            účtu; robí sa ručne. Pri vymazaní platí obmedzenie opísané vyššie
            pri histórii darov.
          </li>
        </LegalList>
        <p>
          Ak s naším postupom nesúhlasíš, môžeš podať sťažnosť na Úrad na
          ochranu osobných údajov Slovenskej republiky.
        </p>
      </LegalSection>

      <LegalSection title="Deti">
        <p>
          Účet vznikne jedine prihlásením cez Google, takže o tom, kto si ho
          môže vytvoriť, rozhodujú vekové pravidlá Googlu. Appka sama vek
          nezisťuje.
        </p>
      </LegalSection>

      <LegalSection title="Zmeny">
        <p>
          Ak sa tieto pravidlá zmenia, upravíme túto stránku a posunieme dátum
          účinnosti hore. Podstatnú zmenu oznámime aj v appke.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
