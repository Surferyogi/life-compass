
c = open("dist/index.html").read()
c = c.replace("src="/_expo/", "src="/life-compass/_expo/")
c = c.replace("href="/favicon", "href="/life-compass/favicon")
open("dist/index.html","w").write(c)
print("Patched")
