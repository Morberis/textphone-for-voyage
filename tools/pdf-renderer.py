"""Render the reconciled release guide content; no external document services."""
from pathlib import Path
import importlib.util, html, json, re
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph, Table, TableStyle, Spacer, Preformatted
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

root=Path(__file__).parent
import os
fonts=Path(os.environ.get('TEXTPHONE_FONT_DIR','C:/Windows/Fonts'))
for name,file in [('Body','arial.ttf'),('Bold','arialbd.ttf'),('Code','consola.ttf')]:
    pdfmetrics.registerFont(TTFont(name,str(fonts/file)))
ink=colors.HexColor('#E9EDF3');cyan=colors.HexColor('#C4FF00');magenta=colors.HexColor('#8B2BFF')
background=colors.HexColor('#111318');panel=colors.HexColor('#1A1D26')
muted=colors.HexColor('#BCC7DA');light=colors.HexColor('#2A2038')
W,H=612,792;left=44;width=524

def para(text,size=10.4,bold=False):
    return Paragraph(html.escape(str(text)).replace('\n','<br/>'),ParagraphStyle('p',fontName='Bold' if bold else 'Body',fontSize=size,leading=size*1.36,textColor=cyan if bold else ink,spaceAfter=7))

def blocks(page,size=10.4):
    result=[]
    if page.get('lead'):result += [para(page['lead'],size,True),Spacer(1,6)]
    for text in page.get('paragraphs',[]):
        result.append(para(text,size))
        if page.get('paragraph_spacing'):result.append(Spacer(1,page['paragraph_spacing']))
    if page.get('code'):
        code=page['code'].replace('node --test test/*.test.mjs','npm test')
        result += [Preformatted(code,ParagraphStyle('code',fontName='Code',fontSize=min(size-1.6,8.5),leading=size*1.15,textColor=ink)),Spacer(1,12)]
    if page.get('table'):
        rows=[[para(cell,size-.5,i==0) for cell in row] for i,row in enumerate(page['table'])]
        if page.get('contents'):
            for i,row in enumerate(page['table'][1:],1):
                rows[i][0]=Paragraph('<link href="#page'+row[1]+'" color="#C4FF00">'+html.escape(row[0])+'</link>',ParagraphStyle('toclink',fontName='Body',fontSize=size-.5,leading=(size-.5)*1.36,textColor=ink,spaceAfter=7))
        table=Table(rows,colWidths=([width-44,44] if page.get('contents') else [156,width-156]),hAlign='LEFT')
        table.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),('ROWBACKGROUNDS',(0,1),(-1,-1),[panel,background]),('BACKGROUND',(0,0),(-1,0),light),('LINEBELOW',(0,0),(-1,0),1,cyan),('LINEBELOW',(0,1),(-1,-1),.35,colors.HexColor('#454059')),('LEFTPADDING',(0,0),(-1,-1),7),('RIGHTPADDING',(0,0),(-1,-1),7),('TOPPADDING',(0,0),(-1,-1),6),('BOTTOMPADDING',(0,0),(-1,-1),5)]))
        result += [table,Spacer(1,10)]
    result += [para(x,size) for x in page.get('paragraphs_after',[])]
    result += [para('• '+x,size) for x in page.get('bullets',[])]
    for label,url in page.get('links',[]):
        result.append(Paragraph(f'<link href="{html.escape(url,quote=True)}" color="#C4FF00">{html.escape(label)}</link>',ParagraphStyle('link',fontName='Body',fontSize=size,leading=size*1.4,spaceAfter=7)))
    if page.get('note'):result += [Spacer(1,4),para(page['note'],size-.5)]
    return result

def chrome(c,title,index,total,series):
    c.setFillColor(background);c.rect(0,0,W,H,fill=1,stroke=0)
    c.setStrokeColor(magenta);c.setLineWidth(1.1)
    traces=[[(19,H-122),(19,H-38),(34,H-23),(218,H-23)],
            [(W-19,150),(W-19,54),(W-34,39),(W-65,39)],
            [(19,210),(19,70),(29,60),(38,60)],
            [(W-19,H-145),(W-19,H-60),(W-32,H-47)]]
    for points in traces:
        path=c.beginPath();path.moveTo(*points[0])
        for point in points[1:]:path.lineTo(*point)
        c.drawPath(path)
    c.setFillColor(cyan)
    for x,y in [(19,H-122),(218,H-23),(W-19,150),(38,60)]:c.circle(x,y,2.4,fill=1,stroke=0)
    c.setFont('Bold',9);c.setFillColor(muted);c.drawString(left,H-56,series.upper())
    heading=Paragraph(html.escape(title),ParagraphStyle('banner',fontName='Bold',fontSize=19,leading=23,textColor=background))
    _,height=heading.wrap(width-68,100)
    bottom=H-82-height;top=H-69
    c.setFillColor(cyan)
    banner=c.beginPath();banner.moveTo(left+41,bottom);banner.lineTo(W-left,bottom);banner.lineTo(W-left,top-12);banner.lineTo(W-left-12,top);banner.lineTo(left+41,top);banner.close();c.drawPath(banner,fill=1,stroke=0)
    heading.drawOn(c,left+51,bottom+7)
    c.setFillColor(light);c.rect(left,bottom,33,top-bottom,fill=1,stroke=0)
    c.setFont('Bold',13);c.setFillColor(cyan);c.drawCentredString(left+16.5,bottom+(top-bottom-13)/2+2,str(index).zfill(2))
    c.setStrokeColor(colors.HexColor('#454059'));c.line(left,40,W-left,40)
    c.setFont('Body',8);c.setFillColor(muted);c.drawString(left,27,'TextPhone 0.6.0 · September 2026')
    c.setFillColor(cyan);c.drawRightString(W-left,27,f'{index} / {total}')
    return bottom-16

def make_pdf(path,pages,series):
    toc_count=1 if len(pages)<=20 else 2
    toc_pages=[]
    for chunk in range(toc_count):
        selected=pages[chunk*16:(chunk+1)*16] if toc_count>1 else pages
        offset=chunk*16 if toc_count>1 else 0
        toc_pages.append({'title':'Creator guide and reference' if chunk==0 else 'Contents continued','contents':True,'lead':series+' | Creator guide 0.6.0','paragraphs':['Local testing, configuration and Voyage installation are separate workflows. Follow the complete merge and readback steps before a fresh game.'] if chunk==0 else [],'table':[['Contents','Page']]+[[p['title'],str(i+offset+toc_count+1)] for i,p in enumerate(selected)]})
    all_pages=toc_pages+pages
    c=canvas.Canvas(str(path),pagesize=(W,H));c.setTitle(series);c.setAuthor('Morberis')
    for index,page in enumerate(all_pages,1):
        c.bookmarkPage('page'+str(index));c.addOutlineEntry(page['title'],'page'+str(index),level=0)
        top=chrome(c,page['title'],index,len(all_pages),series)
        chosen=None
        for size in [10.4,10.0,9.6,9.2]:
            flow=blocks(page,size);measure=[x.wrap(width,H)[1]+(getattr(x,'spaceAfter',0) or 0) for x in flow]
            if sum(measure)<=top-55:chosen=(flow,measure,size);break
        if not chosen:raise ValueError('Page too long: '+page['title'])
        flow,heights,size=chosen;y=top
        for item,height in zip(flow,heights):
            actual=item.wrap(width,H)[1];y-=actual;item.drawOn(c,left,y);y-=height-actual
        if page.get('checklist'):
            for n,label in enumerate(page['checklist']):
                p=para(label,10);_,ph=p.wrap(width-24,H)
                y-=ph+11
                if y<55:raise ValueError('Checklist overflow')
                c.acroForm.checkbox(name=f'check_{index}_{n}',tooltip=label,x=left,y=y+ph-12,size=12,borderWidth=1,borderColor=cyan,fillColor=panel,textColor=cyan,buttonStyle='check',checked=False)
                p.drawOn(c,left+24,y)
        c.showPage()
    c.save()
    return len(all_pages)

