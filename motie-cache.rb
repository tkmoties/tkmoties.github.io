require 'net/http'
require 'uri'

top = 5

urlApi = 'https://gegevensmagazijn.tweedekamer.nl/OData/v4/2.0'

motieQuery = "
Besluit?
&$orderby=ApiGewijzigdOp desc
#{top}
&$count=true
&$expand=Zaak(
  $expand=ZaakActor(
    $select=Id,ActorNaam,ActorFractie
    ;$filter=Relatie eq 'Indiener' or Relatie eq 'MedeIndiener'
  )
  ;$select=Id,Nummer,Titel,Onderwerp,Kabinetsappreciatie,GestartOp,GewijzigdOp,ApiGewijzigdOp
),
Stemming(
  $filter=Verwijderd eq false
  ;$select=Id,Soort,FractieGrootte,ActorNaam,ActorFractie
)
&$select=Id,BesluitSoort,StemmingsSoort,GewijzigdOp,ApiGewijzigdOp
&$filter=Verwijderd eq false and Zaak/any(a: a/Soort eq 'Motie') and StemmingsSoort ne null".gsub(/\\n/, "")

uri = URI.parse(urlApi + "/" + motieQuery)
response = Net::HTTP.get_response uri
p response.body